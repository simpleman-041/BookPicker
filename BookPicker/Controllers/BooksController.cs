using BookPicker.Data;
using BookPicker.Models;
using BookPicker.Requests;
using BookPicker.Services;
using BookPicker;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BookPicker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BooksController : ControllerBase
    {
        // コンストラクタで受け取った BookPickerDbContext をプライベートフィールドに格納しておく
        private readonly BookPickerDbContext _dbContext;
        private readonly string _webRootPath;
        private const long MaximumCoverFileSize = 5 * 1024 * 1024;
        // Leave room for multipart boundaries and per-part headers around a 5 MiB file.
        private const long MaximumCoverRequestBodySize = 6 * 1024 * 1024;
        private const int MaximumCoverFileSignatureLength = 12;
        private const string CoverUrlPrefix = "/uploads/covers/";
        private static readonly byte[] PngFileSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        private static readonly byte[] JpegFileSignature = [0xFF, 0xD8, 0xFF];
        private static readonly IReadOnlyDictionary<string, CoverImageFormat> AllowedCoverImageFormats =
            new Dictionary<string, CoverImageFormat>(StringComparer.OrdinalIgnoreCase)
            {
                [".jpg"] = CoverImageFormat.Jpeg,
                [".jpeg"] = CoverImageFormat.Jpeg,
                [".png"] = CoverImageFormat.Png,
                [".webp"] = CoverImageFormat.WebP
            };

        public BooksController(BookPickerDbContext dbContext, IWebHostEnvironment webHostEnvironment)
        {
            _dbContext = dbContext;
            _webRootPath = Path.GetFullPath(
                string.IsNullOrWhiteSpace(webHostEnvironment.WebRootPath)
                    ? Path.Combine(webHostEnvironment.ContentRootPath, "wwwroot")
                    : webHostEnvironment.WebRootPath);
        }

        [HttpGet("{id}")]
        [EnableRateLimiting(RateLimitPolicies.Read)]
        public async Task<IActionResult> GetBook(int id)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }
            return Ok(book);
        }

        [HttpDelete("{id}")]
        [EnableRateLimiting(RateLimitPolicies.Write)]
        public async Task<IActionResult> DeleteBook(int id)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }
            _dbContext.Books.Remove(book);
            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost]
        [EnableRateLimiting(RateLimitPolicies.Write)]
        public async Task<IActionResult> CreateBook(CreateBookRequest createBookRequest)
        {
            try
            {
                var book = new Book(
                    createBookRequest.Title,
                    createBookRequest.Genre,
                    createBookRequest.TotalPages,
                    createBookRequest.InterestLevel,
                    createBookRequest.CoverImagePath
                    );
                _dbContext.Books.Add(book);
                await _dbContext.SaveChangesAsync();
                return CreatedAtAction(nameof(GetBook), new { id = book.Id }, book);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            
            
        }

        [HttpPut("{id}")]
        [EnableRateLimiting(RateLimitPolicies.Write)]
        public async Task<IActionResult> UpdateBook(int id, UpdateBookRequest updateBookRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }

            try
            {
                book.UpdateDetails(
                    updateBookRequest.Title,
                    updateBookRequest.Genre,
                    updateBookRequest.TotalPages,
                    updateBookRequest.CurrentPage,
                    updateBookRequest.InterestLevel,
                    updateBookRequest.CoverImagePath);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id}/cover")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(MaximumCoverRequestBodySize)]
        [EnableRateLimiting(RateLimitPolicies.CoverUpload)]
        public async Task<IActionResult> UploadCover(
            int id,
            [FromForm] IFormFile? file,
            CancellationToken cancellationToken = default)
        {
            var book = await _dbContext.Books.FindAsync([id], cancellationToken);
            if (book == null)
            {
                return NotFound();
            }

            var validationError = await ValidateCoverFileAsync(file, cancellationToken);
            if (validationError != null)
            {
                return BadRequest(validationError);
            }

            var extension = Path.GetExtension(file!.FileName).ToLowerInvariant();
            var generatedFileName = $"{Guid.NewGuid():N}{extension}";
            var coversDirectoryPath = GetCoversDirectoryPath();
            var newPhysicalPath = Path.Combine(coversDirectoryPath, generatedFileName);
            var newCoverImagePath = $"{CoverUrlPrefix}{generatedFileName}";
            var previousCoverImagePath = book.CoverImagePath;
            var newFileCreated = false;

            try
            {
                Directory.CreateDirectory(coversDirectoryPath);

                await using (var destination = new FileStream(
                    newPhysicalPath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None,
                    bufferSize: 81920,
                    useAsync: true))
                {
                    newFileCreated = true;
                    await file.CopyToAsync(destination, cancellationToken);
                }

                book.UpdateCoverImagePath(newCoverImagePath);

                try
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
                catch
                {
                    book.UpdateCoverImagePath(previousCoverImagePath);
                    throw;
                }
            }
            catch
            {
                if (newFileCreated)
                {
                    TryDeleteFile(newPhysicalPath);
                }

                throw;
            }

            var previousPhysicalPath = GetManagedCoverPhysicalPath(previousCoverImagePath);
            if (previousPhysicalPath != null
                && !string.Equals(previousPhysicalPath, newPhysicalPath, StringComparison.OrdinalIgnoreCase))
            {
                TryDeleteFile(previousPhysicalPath);
            }

            return Ok(book);
        }

        [HttpPut("{id}/completion")]
        [EnableRateLimiting(RateLimitPolicies.Write)]
        public async Task<IActionResult> UpdateCompletion(int id, UpdateCompletionRequest updateCompletionRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }

            book.SetIsCompleted(updateCompletionRequest.IsCompleted);

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/favorite")]
        [EnableRateLimiting(RateLimitPolicies.Write)]
        public async Task<IActionResult> UpdateFavorite(int id, UpdateFavoriteRequest updateFavoriteRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }

            book.SetIsFavorite(updateFavoriteRequest.IsFavorite);

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/progress")]
        [EnableRateLimiting(RateLimitPolicies.Write)]
        public async Task<IActionResult> UpdateCurrentPage(int id, UpdateCurrentPageRequest updateCurrentPageRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }
            
            // 現在ページが総ページを超える、負の値といった矛盾したケースを想定
            try
            {
                book.UpdateCurrentPageAndReadingStatus(updateCurrentPageRequest.CurrentPage);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// リクエストされたフィルター条件、並び替え条件をもとに、書籍のリストを取得する。
        /// </summary>
        /// <param name="filterRequest">フィルター条件をまとめたオブジェクト</param>
        /// <param name="sortRequest">並び替え条件をまとめたオブジェクト</param>
        /// <returns></returns>
        [HttpGet]
        [EnableRateLimiting(RateLimitPolicies.Read)]
        public async Task<IActionResult> FilterAndSort([FromQuery] FilterRequest filterRequest, [FromQuery] SortRequest sortRequest)
        {
            // 並び替え条件が無効な場合は DBアクセスを行わずに BadRequest を返す
            if (sortRequest.IsValid == false) return BadRequest("Invalid sort request.");

            try
            {
                var filterCriteria = new FilterCriteria(
                    filterRequest.IsCompleted,
                    filterRequest.IsFavorite,
                    filterRequest.Genre,
                    filterRequest.MinPages,
                    filterRequest.MaxPages,
                    filterRequest.ReadingStatus,
                    filterRequest.InterestLevel,
                    filterRequest.SearchTitle,
                    filterRequest.TitleMatchMode
                );

                SortCriteria? sortCriteria = null;
                if (sortRequest.Field.HasValue && sortRequest.Order.HasValue)
                {
                    sortCriteria = new SortCriteria(sortRequest.Field.Value, sortRequest.Order.Value);
                }

                var books = await _dbContext.Books.ToListAsync();
                var filterService = new FilterService();
                var filteredBooks = filterService.FilterBooks(books, filterCriteria);

                if (sortCriteria == null)
                {
                    return Ok(filteredBooks.OrderByDescending(book => book.Id));
                }

                var sortService = new SortService();
                var sortedBooks = sortService.SortBooks(filteredBooks, sortCriteria);

                return Ok(sortedBooks);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private static async Task<string?> ValidateCoverFileAsync(
            IFormFile? file,
            CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
            {
                return "画像ファイルを選択してください。";
            }

            if (file.Length > MaximumCoverFileSize)
            {
                return "画像は5MB以下にしてください。";
            }

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedCoverImageFormats.TryGetValue(extension, out var expectedImageFormat))
            {
                return "対応していない画像形式です。.jpg、.jpeg、.png、.webp のいずれかを選択してください。";
            }

            if (!string.Equals(
                    file.ContentType,
                    GetContentType(expectedImageFormat),
                    StringComparison.OrdinalIgnoreCase))
            {
                return "画像のContent-Typeがファイル形式と一致しません。";
            }

            await using var stream = file.OpenReadStream();
            var header = new byte[MaximumCoverFileSignatureLength];
            var bytesRead = await ReadHeaderAsync(stream, header, cancellationToken);

            if (stream.CanSeek)
            {
                stream.Position = 0;
            }

            if (DetectCoverImageFormat(header.AsSpan(0, bytesRead)) != expectedImageFormat)
            {
                return "画像の内容がファイル形式と一致しません。";
            }

            return null;
        }

        private static async Task<int> ReadHeaderAsync(
            Stream stream,
            Memory<byte> buffer,
            CancellationToken cancellationToken)
        {
            var totalBytesRead = 0;

            while (totalBytesRead < buffer.Length)
            {
                var bytesRead = await stream.ReadAsync(buffer[totalBytesRead..], cancellationToken);
                if (bytesRead == 0)
                {
                    break;
                }

                totalBytesRead += bytesRead;
            }

            return totalBytesRead;
        }

        private static CoverImageFormat? DetectCoverImageFormat(ReadOnlySpan<byte> header)
        {
            if (header.Length >= 8
                && header[..8].SequenceEqual(PngFileSignature))
            {
                return CoverImageFormat.Png;
            }

            if (header.Length >= 3
                && header[..3].SequenceEqual(JpegFileSignature))
            {
                return CoverImageFormat.Jpeg;
            }

            if (header.Length >= 12
                && header[..4].SequenceEqual("RIFF"u8)
                && header[8..12].SequenceEqual("WEBP"u8))
            {
                return CoverImageFormat.WebP;
            }

            return null;
        }

        private static string GetContentType(CoverImageFormat imageFormat)
        {
            return imageFormat switch
            {
                CoverImageFormat.Jpeg => "image/jpeg",
                CoverImageFormat.Png => "image/png",
                CoverImageFormat.WebP => "image/webp",
                _ => throw new ArgumentOutOfRangeException(nameof(imageFormat))
            };
        }

        private string GetCoversDirectoryPath()
        {
            return Path.GetFullPath(Path.Combine(_webRootPath, "uploads", "covers"));
        }

        private string? GetManagedCoverPhysicalPath(string? coverImagePath)
        {
            if (string.IsNullOrWhiteSpace(coverImagePath)
                || !coverImagePath.StartsWith(CoverUrlPrefix, StringComparison.Ordinal))
            {
                return null;
            }

            var fileName = coverImagePath[CoverUrlPrefix.Length..];
            if (string.IsNullOrWhiteSpace(fileName)
                || !string.Equals(fileName, Path.GetFileName(fileName), StringComparison.Ordinal))
            {
                return null;
            }

            var extension = Path.GetExtension(fileName);
            var generatedName = Path.GetFileNameWithoutExtension(fileName);
            if (!AllowedCoverImageFormats.ContainsKey(extension)
                || !Guid.TryParseExact(generatedName, "N", out _))
            {
                return null;
            }

            var coversDirectoryPath = GetCoversDirectoryPath();
            var candidatePath = Path.GetFullPath(Path.Combine(coversDirectoryPath, fileName));
            var directoryPrefix = coversDirectoryPath.TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

            return candidatePath.StartsWith(directoryPrefix, StringComparison.OrdinalIgnoreCase)
                ? candidatePath
                : null;
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (System.IO.File.Exists(path))
                {
                    System.IO.File.Delete(path);
                }
            }
            catch (IOException)
            {
                // DB更新済みのため、古い表紙の削除失敗でアップロード結果を失敗扱いにしない。
            }
            catch (UnauthorizedAccessException)
            {
                // DB更新済みのため、古い表紙の削除失敗でアップロード結果を失敗扱いにしない。
            }
        }

        private enum CoverImageFormat
        {
            Jpeg,
            Png,
            WebP
        }
    }
}
