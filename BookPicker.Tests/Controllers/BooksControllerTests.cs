using BookPicker;
using BookPicker.Controllers;
using BookPicker.Data;
using BookPicker.Models;
using BookPicker.Requests;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

namespace BookPicker.Tests.Controllers;

public class BooksControllerTests
{
    [Fact]
    public async Task UploadCover_WithMissingBook_ReturnsNotFoundWithoutCreatingUploadDirectory()
    {
        using var database = new TestDatabase();
        using var stream = new MemoryStream([1, 2, 3]);
        var file = CreateFormFile(stream, "cover.jpg", "image/jpeg");

        var result = await database.Controller.UploadCover(999, file);

        Assert.IsType<NotFoundResult>(result);
        Assert.False(Directory.Exists(database.CoversDirectoryPath));
    }

    [Fact]
    public async Task UploadCover_WithEmptyFile_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream();
        var file = CreateFormFile(stream, "cover.png", "image/png");

        var result = await database.Controller.UploadCover(book.Id, file);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("画像ファイルを選択してください。", badRequest.Value);
        Assert.Null(book.CoverImagePath);
    }

    [Fact]
    public async Task UploadCover_WithUnsupportedExtension_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream([1, 2, 3]);
        var file = CreateFormFile(stream, "cover.gif", "image/gif");

        var result = await database.Controller.UploadCover(book.Id, file);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Null(book.CoverImagePath);
    }

    [Fact]
    public async Task UploadCover_WithContentTypeThatDoesNotMatchExtension_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream([1, 2, 3]);
        var file = CreateFormFile(stream, "cover.png", "image/jpeg");

        var result = await database.Controller.UploadCover(book.Id, file);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("画像のContent-Typeがファイル形式と一致しません。", badRequest.Value);
        Assert.Null(book.CoverImagePath);
    }

    [Fact]
    public async Task UploadCover_WithFileLargerThanFiveMegabytes_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream(new byte[(5 * 1024 * 1024) + 1]);
        var file = CreateFormFile(stream, "cover.webp", "image/webp");

        var result = await database.Controller.UploadCover(book.Id, file);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("画像は5MB以下にしてください。", badRequest.Value);
        Assert.Null(book.CoverImagePath);
    }

    [Fact]
    public async Task UploadCover_WithFileOfExactlyFiveMegabytes_AcceptsTheFile()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        var bytes = CreateImageBytes(".jpg", 5 * 1024 * 1024);
        using var stream = new MemoryStream(bytes);
        var file = CreateFormFile(stream, "cover.jpg", "image/jpeg");

        var result = await database.Controller.UploadCover(book.Id, file);

        Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(book.CoverImagePath);
        Assert.Equal(bytes.Length, new FileInfo(database.GetPhysicalPath(book.CoverImagePath)).Length);
    }

    [Fact]
    public void UploadCover_HasRequestBodySizeLimit()
    {
        var action = typeof(BooksController).GetMethod(nameof(BooksController.UploadCover));
        Assert.NotNull(action);

        Assert.Single(
            action.GetCustomAttributes(inherit: true).OfType<RequestSizeLimitAttribute>());
    }

    [Fact]
    public void UploadCover_HasCoverUploadRateLimitPolicy()
    {
        var action = typeof(BooksController).GetMethod(nameof(BooksController.UploadCover));
        Assert.NotNull(action);

        var attribute = Assert.Single(
            action.GetCustomAttributes(inherit: true).OfType<EnableRateLimitingAttribute>());

        Assert.Equal(RateLimitPolicies.CoverUpload, attribute.PolicyName);
    }

    [Theory]
    [InlineData(".jpg", "image/jpeg")]
    [InlineData(".jpeg", "image/jpeg")]
    [InlineData(".png", "image/png")]
    [InlineData(".webp", "image/webp")]
    public async Task UploadCover_WithAllowedImage_UpdatesPathAndSavesGuidNamedFile(
        string extension,
        string contentType)
    {
        using var database = new TestDatabase();
        var book = database.AddBook(currentPage: 10);
        var previousLastReadAt = book.LastReadAt;
        var originalBytes = CreateImageBytes(extension);
        using var stream = new MemoryStream(originalBytes);
        var file = CreateFormFile(stream, $"user-supplied-name{extension}", contentType);

        var result = await database.Controller.UploadCover(book.Id, file);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(book, ok.Value);
        Assert.NotNull(book.CoverImagePath);
        Assert.StartsWith("/uploads/covers/", book.CoverImagePath);
        Assert.EndsWith(extension, book.CoverImagePath, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("user-supplied-name", book.CoverImagePath);

        var generatedName = Path.GetFileNameWithoutExtension(book.CoverImagePath);
        Assert.True(Guid.TryParseExact(generatedName, "N", out _));

        var savedPhysicalPath = database.GetPhysicalPath(book.CoverImagePath);
        Assert.True(File.Exists(savedPhysicalPath));
        Assert.Equal(originalBytes, await File.ReadAllBytesAsync(savedPhysicalPath));
        Assert.Equal(previousLastReadAt, book.LastReadAt);
    }

    [Fact]
    public async Task UploadCover_WithTextDisguisedAsPng_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream("not an image"u8.ToArray());
        var file = CreateFormFile(stream, "fake.png", "image/png");

        var result = await database.Controller.UploadCover(book.Id, file);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("画像の内容がファイル形式と一致しません。", badRequest.Value);
        Assert.Null(book.CoverImagePath);
        Assert.False(Directory.Exists(database.CoversDirectoryPath));
    }

    [Fact]
    public async Task UploadCover_WithPngNameAndContentTypeButJpegContent_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream(CreateImageBytes(".jpg"));
        var file = CreateFormFile(stream, "cover.png", "image/png");

        var result = await database.Controller.UploadCover(book.Id, file);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("画像の内容がファイル形式と一致しません。", badRequest.Value);
        Assert.Null(book.CoverImagePath);
    }

    [Fact]
    public async Task UploadCover_WithJpegNameAndContentTypeButPngContent_ReturnsBadRequest()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        using var stream = new MemoryStream(CreateImageBytes(".png"));
        var file = CreateFormFile(stream, "cover.jpg", "image/jpeg");

        var result = await database.Controller.UploadCover(book.Id, file);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("画像の内容がファイル形式と一致しません。", badRequest.Value);
        Assert.Null(book.CoverImagePath);
    }

    [Fact]
    public async Task UploadCover_WhenReplacingManagedCover_DeletesPreviousFileAfterUpdate()
    {
        using var database = new TestDatabase();
        var previousCoverPath = $"/uploads/covers/{Guid.NewGuid():N}.png";
        var previousPhysicalPath = database.CreateWebRootFile(previousCoverPath, [4, 5, 6]);
        var book = database.AddBook(coverImagePath: previousCoverPath);
        using var stream = new MemoryStream(CreateImageBytes(".png"));
        var file = CreateFormFile(stream, "replacement.png", "image/png");

        var result = await database.Controller.UploadCover(book.Id, file);

        Assert.IsType<OkObjectResult>(result);
        Assert.False(File.Exists(previousPhysicalPath));
        Assert.True(File.Exists(database.GetPhysicalPath(book.CoverImagePath!)));
    }

    [Fact]
    public async Task UploadCover_WhenReplacingDefaultCover_DoesNotDeleteDefaultFile()
    {
        using var database = new TestDatabase();
        const string defaultCoverPath = "/images/default-book-cover.png";
        var defaultPhysicalPath = database.CreateWebRootFile(defaultCoverPath, [7, 8, 9]);
        var book = database.AddBook(coverImagePath: defaultCoverPath);
        using var stream = new MemoryStream(CreateImageBytes(".jpg"));
        var file = CreateFormFile(stream, "replacement.jpg", "image/jpeg");

        var result = await database.Controller.UploadCover(book.Id, file);

        Assert.IsType<OkObjectResult>(result);
        Assert.True(File.Exists(defaultPhysicalPath));
    }

    [Fact]
    public async Task UploadCover_WhenReplacingExternalUrl_DoesNotDeleteFilesOutsideManagedDirectory()
    {
        using var database = new TestDatabase();
        var outsidePhysicalPath = database.CreateWebRootFile("/images/external-sentinel.png", [7, 8, 9]);
        var book = database.AddBook(coverImagePath: "https://example.com/cover.png");
        using var stream = new MemoryStream(CreateImageBytes(".jpg"));
        var file = CreateFormFile(stream, "replacement.jpg", "image/jpeg");

        var result = await database.Controller.UploadCover(book.Id, file);

        Assert.IsType<OkObjectResult>(result);
        Assert.True(File.Exists(outsidePhysicalPath));
    }

    [Fact]
    public async Task UploadCover_WithTraversalInPreviousPath_DoesNotDeleteEscapedFile()
    {
        using var database = new TestDatabase();
        var protectedPhysicalPath = database.CreateWebRootFile("/uploads/protected.jpg", [7, 8, 9]);
        var book = database.AddBook(coverImagePath: "/uploads/covers/../protected.jpg");
        using var stream = new MemoryStream(CreateImageBytes(".jpg"));
        var file = CreateFormFile(stream, "replacement.jpg", "image/jpeg");

        var result = await database.Controller.UploadCover(book.Id, file);

        Assert.IsType<OkObjectResult>(result);
        Assert.True(File.Exists(protectedPhysicalPath));
    }

    [Fact]
    public async Task UpdateBook_WithValidRequest_UpdatesEditableValuesAndReturnsNoContent()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 500, currentPage: 400, coverImagePath: "/old.jpg");
        var request = new UpdateBookRequest
        {
            Title = "Updated Book",
            Genre = Genre.Science,
            TotalPages = 300,
            CurrentPage = 250,
            InterestLevel = InterestLevel.PrimaryInterest,
            CoverImagePath = "https://example.com/new.jpg"
        };

        var result = await database.Controller.UpdateBook(book.Id, request);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("Updated Book", book.Title);
        Assert.Equal(Genre.Science, book.Genre);
        Assert.Equal(300, book.TotalPages);
        Assert.Equal(250, book.CurrentPage);
        Assert.Equal(InterestLevel.PrimaryInterest, book.InterestLevel);
        Assert.Equal("https://example.com/new.jpg", book.CoverImagePath);
    }

    [Fact]
    public async Task UpdateBook_WithMissingId_ReturnsNotFound()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.UpdateBook(999, ValidUpdateRequest());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateBook_WithInvalidFinalPageState_ReturnsBadRequestWithoutChangingBook()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 40);
        var request = ValidUpdateRequest();
        request.TotalPages = 30;
        request.CurrentPage = 40;

        var result = await database.Controller.UpdateBook(book.Id, request);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Test Book", book.Title);
        Assert.Equal(100, book.TotalPages);
        Assert.Equal(40, book.CurrentPage);
    }

    [Fact]
    public void UpdateBookRequest_ContainsOnlyGenerallyEditableBookProperties()
    {
        var propertyNames = typeof(UpdateBookRequest)
            .GetProperties()
            .Select(property => property.Name)
            .OrderBy(name => name)
            .ToArray();
        var expectedPropertyNames = new[]
        {
            nameof(Book.CoverImagePath),
            nameof(Book.CurrentPage),
            nameof(Book.Genre),
            nameof(Book.InterestLevel),
            nameof(Book.Title),
            nameof(Book.TotalPages)
        }.OrderBy(name => name);

        Assert.Equal(expectedPropertyNames, propertyNames);
        Assert.DoesNotContain(nameof(Book.ReadingStatus), propertyNames);
        Assert.DoesNotContain(nameof(Book.LastReadAt), propertyNames);
        Assert.DoesNotContain(nameof(Book.IsCompleted), propertyNames);
        Assert.DoesNotContain(nameof(Book.IsFavorite), propertyNames);
    }

    [Fact]
    public async Task UpdateBook_WhenCurrentPageIncreases_UpdatesLastReadAt()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 10);
        var previousLastReadAt = book.LastReadAt!.Value;
        WaitForUtcClockToAdvance(previousLastReadAt);
        var request = ValidUpdateRequest();
        request.CurrentPage = 20;

        var result = await database.Controller.UpdateBook(book.Id, request);

        Assert.IsType<NoContentResult>(result);
        Assert.True(book.LastReadAt > previousLastReadAt);
    }

    [Theory]
    [InlineData(50)]
    [InlineData(40)]
    public async Task UpdateBook_WhenCurrentPageDoesNotIncrease_DoesNotUpdateLastReadAt(int currentPage)
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 50);
        var previousLastReadAt = book.LastReadAt;
        var request = ValidUpdateRequest();
        request.CurrentPage = currentPage;

        var result = await database.Controller.UpdateBook(book.Id, request);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(previousLastReadAt, book.LastReadAt);
    }

    [Fact]
    public async Task UpdateCompletion_AtFinalPage_CompletesBookAndUpdatesLastReadAt()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 100);
        var previousLastReadAt = book.LastReadAt!.Value;
        WaitForUtcClockToAdvance(previousLastReadAt);
        var beforeCompletion = DateTime.UtcNow;

        var result = await database.Controller.UpdateCompletion(
            book.Id,
            new UpdateCompletionRequest { IsCompleted = true });

        var afterCompletion = DateTime.UtcNow;
        Assert.IsType<NoContentResult>(result);
        Assert.Equal(book.TotalPages, book.CurrentPage);
        Assert.True(book.IsCompleted);
        Assert.Equal(ReadingStatus.Completed, book.ReadingStatus);
        Assert.True(book.LastReadAt > previousLastReadAt);
        Assert.Equal(DateTimeKind.Utc, book.LastReadAt!.Value.Kind);
        Assert.InRange(book.LastReadAt.Value, beforeCompletion, afterCompletion);
    }

    [Fact]
    public async Task UpdateCompletion_BeforeFinalPage_CompletesBookAndPersistsResult()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 99);
        var bookId = book.Id;
        var previousLastReadAt = book.LastReadAt!.Value;
        WaitForUtcClockToAdvance(previousLastReadAt);
        var beforeCompletion = DateTime.UtcNow;

        var result = await database.Controller.UpdateCompletion(
            bookId,
            new UpdateCompletionRequest { IsCompleted = true });

        var afterCompletion = DateTime.UtcNow;
        Assert.IsType<NoContentResult>(result);
        Assert.Equal(book.TotalPages, book.CurrentPage);
        Assert.True(book.IsCompleted);
        Assert.Equal(ReadingStatus.Completed, book.ReadingStatus);
        Assert.True(book.LastReadAt > previousLastReadAt);
        Assert.Equal(DateTimeKind.Utc, book.LastReadAt!.Value.Kind);
        Assert.InRange(book.LastReadAt.Value, beforeCompletion, afterCompletion);

        database.Context.ChangeTracker.Clear();
        var getResult = await database.Controller.GetBook(bookId);
        var reloadedBook = Assert.IsType<Book>(Assert.IsType<OkObjectResult>(getResult).Value);
        Assert.Equal(reloadedBook.TotalPages, reloadedBook.CurrentPage);
        Assert.True(reloadedBook.IsCompleted);
    }

    [Fact]
    public async Task UpdateCompletion_WithFalse_ClearsCompletionAndReturnsNoContent()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 100);
        book.SetIsCompleted(true);
        await database.Context.SaveChangesAsync();
        var previousCurrentPage = book.CurrentPage;
        var previousLastReadAt = book.LastReadAt;
        WaitForUtcClockToAdvance(previousLastReadAt!.Value);

        var result = await database.Controller.UpdateCompletion(
            book.Id,
            new UpdateCompletionRequest { IsCompleted = false });

        Assert.IsType<NoContentResult>(result);
        Assert.False(book.IsCompleted);
        Assert.Equal(previousCurrentPage, book.CurrentPage);
        Assert.Equal(previousLastReadAt, book.LastReadAt);
        Assert.Equal(ReadingStatus.LateStage, book.ReadingStatus);
    }

    [Fact]
    public async Task UpdateCompletion_WithMissingId_ReturnsNotFound()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.UpdateCompletion(
            999,
            new UpdateCompletionRequest { IsCompleted = true });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateFavorite_WithTrue_FavoritesBookAndPersistsResult()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        var bookId = book.Id;

        var result = await database.Controller.UpdateFavorite(
            bookId,
            new UpdateFavoriteRequest { IsFavorite = true });

        Assert.IsType<NoContentResult>(result);
        Assert.True(book.IsFavorite);

        database.Context.ChangeTracker.Clear();
        var reloadedBook = await database.Context.Books.FindAsync(bookId);
        Assert.NotNull(reloadedBook);
        Assert.True(reloadedBook.IsFavorite);
    }

    [Fact]
    public async Task UpdateFavorite_WithFalse_RemovesBookFromFavorites()
    {
        using var database = new TestDatabase();
        var book = database.AddBook();
        book.SetIsFavorite(true);
        await database.Context.SaveChangesAsync();

        var result = await database.Controller.UpdateFavorite(
            book.Id,
            new UpdateFavoriteRequest { IsFavorite = false });

        Assert.IsType<NoContentResult>(result);
        Assert.False(book.IsFavorite);
    }

    [Fact]
    public async Task UpdateFavorite_WithMissingId_ReturnsNotFound()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.UpdateFavorite(
            999,
            new UpdateFavoriteRequest { IsFavorite = true });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task CreateBook_WithCoverImagePath_PersistsCoverImagePath()
    {
        using var database = new TestDatabase();
        var request = ValidCreateRequest();
        request.CoverImagePath = "https://example.com/cover.jpg";

        var result = await database.Controller.CreateBook(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var book = Assert.IsType<Book>(created.Value);
        Assert.Equal("https://example.com/cover.jpg", book.CoverImagePath);
        Assert.Null(book.LastReadAt);
    }

    [Fact]
    public async Task CreateBook_WithoutCoverImagePath_StillCreatesBook()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.CreateBook(ValidCreateRequest());

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var book = Assert.IsType<Book>(created.Value);
        Assert.Null(book.CoverImagePath);
        Assert.Null(book.LastReadAt);
    }

    [Fact]
    public async Task FilterAndSort_WithoutSort_ReturnsBooksByIdDescending()
    {
        using var database = new TestDatabase();
        var first = database.AddBook(title: "First");
        var second = database.AddBook(title: "Second");
        var third = database.AddBook(title: "Third");

        var books = await GetBooks(database, new SortRequest());

        Assert.Equal(new[] { third.Id, second.Id, first.Id }, books.Select(book => book.Id));
    }

    [Fact]
    public async Task FilterAndSort_ByLastReadAtDescending_ReturnsNewestDateFirst()
    {
        using var database = new TestDatabase();
        var older = database.AddBook(title: "Older");
        var newer = database.AddBook(title: "Newer");
        database.SetLastReadAt(older, new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        database.SetLastReadAt(newer, new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc));

        var books = await GetBooks(database, new SortRequest
        {
            Field = SortField.LastReadAt,
            Order = SortOrder.Descending
        });

        Assert.Equal(new[] { "Newer", "Older" }, books.Select(book => book.Title));
    }

    [Fact]
    public async Task FilterAndSort_ByLastReadAtDescending_PlacesNullDatesLast()
    {
        using var database = new TestDatabase();
        var unread = database.AddBook(title: "Unread");
        var read = database.AddBook(title: "Read");
        database.SetLastReadAt(read, new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var books = await GetBooks(database, new SortRequest
        {
            Field = SortField.LastReadAt,
            Order = SortOrder.Descending
        });

        Assert.Equal(new[] { read.Id, unread.Id }, books.Select(book => book.Id));
    }

    [Theory]
    [InlineData(SortOrder.Ascending, "Short", "Long")]
    [InlineData(SortOrder.Descending, "Long", "Short")]
    public async Task FilterAndSort_ByTotalPages_PreservesExistingSortBehavior(
        SortOrder order,
        string firstExpectedTitle,
        string secondExpectedTitle)
    {
        using var database = new TestDatabase();
        database.AddBook(title: "Long", totalPages: 500);
        database.AddBook(title: "Short", totalPages: 100);

        var books = await GetBooks(database, new SortRequest
        {
            Field = SortField.TotalPages,
            Order = order
        });

        Assert.Equal(new[] { firstExpectedTitle, secondExpectedTitle }, books.Select(book => book.Title));
    }

    [Fact]
    public async Task FilterAndSort_ByInterestLevel_PreservesExistingSortBehavior()
    {
        using var database = new TestDatabase();
        database.AddBook(title: "Low", interestLevel: InterestLevel.NotInterested);
        database.AddBook(title: "High", interestLevel: InterestLevel.PrimaryInterest);

        var books = await GetBooks(database, new SortRequest
        {
            Field = SortField.InterestLevel,
            Order = SortOrder.Descending
        });

        Assert.Equal(new[] { "High", "Low" }, books.Select(book => book.Title));
    }

    [Fact]
    public async Task FilterAndSort_WithValidFilters_PreservesExistingFilterBehavior()
    {
        using var database = new TestDatabase();
        database.AddBook(
            title: "Matching Science Book",
            genre: Genre.Science,
            interestLevel: InterestLevel.PrimaryInterest);
        database.AddBook(
            title: "Low Interest Science Book",
            genre: Genre.Science,
            interestLevel: InterestLevel.SlightlyInterested);
        database.AddBook(
            title: "Matching Fiction Book",
            genre: Genre.Fiction,
            interestLevel: InterestLevel.PrimaryInterest);

        var result = await database.Controller.FilterAndSort(
            new FilterRequest
            {
                Genre = Genre.Science,
                InterestLevel = InterestLevel.ModeratelyInterested,
                SearchTitle = "Matching",
                TitleMatchMode = TitleMatchMode.Partial
            },
            new SortRequest());

        var ok = Assert.IsType<OkObjectResult>(result);
        var book = Assert.Single(Assert.IsAssignableFrom<IEnumerable<Book>>(ok.Value));
        Assert.Equal("Matching Science Book", book.Title);
    }

    [Fact]
    public async Task FilterAndSort_WithIsFavoriteTrue_ReturnsOnlyFavoriteBooks()
    {
        using var database = new TestDatabase();
        var favorite = database.AddBook(title: "Favorite");
        database.AddBook(title: "Not Favorite");
        favorite.SetIsFavorite(true);
        await database.Context.SaveChangesAsync();

        var result = await database.Controller.FilterAndSort(
            new FilterRequest { IsFavorite = true },
            new SortRequest());

        var ok = Assert.IsType<OkObjectResult>(result);
        var book = Assert.Single(Assert.IsAssignableFrom<IEnumerable<Book>>(ok.Value));
        Assert.Equal(favorite.Id, book.Id);
    }

    [Fact]
    public async Task FilterAndSort_WithFavoriteAndOtherFilters_AppliesConditionsWithAnd()
    {
        using var database = new TestDatabase();
        var matchingFavorite = database.AddBook(
            title: "Favorite Science Guide",
            genre: Genre.Science,
            interestLevel: InterestLevel.PrimaryInterest);
        var nonFavoriteMatch = database.AddBook(
            title: "Favorite Science Reference",
            genre: Genre.Science,
            interestLevel: InterestLevel.PrimaryInterest);
        var favoriteWrongGenre = database.AddBook(
            title: "Favorite Fiction Guide",
            genre: Genre.Fiction,
            interestLevel: InterestLevel.PrimaryInterest);
        matchingFavorite.SetIsFavorite(true);
        favoriteWrongGenre.SetIsFavorite(true);
        await database.Context.SaveChangesAsync();

        var result = await database.Controller.FilterAndSort(
            new FilterRequest
            {
                IsFavorite = true,
                Genre = Genre.Science,
                InterestLevel = InterestLevel.HighlyInterested,
                SearchTitle = "Guide",
                TitleMatchMode = TitleMatchMode.Partial
            },
            new SortRequest());

        var ok = Assert.IsType<OkObjectResult>(result);
        var book = Assert.Single(Assert.IsAssignableFrom<IEnumerable<Book>>(ok.Value));
        Assert.Equal(matchingFavorite.Id, book.Id);
        Assert.NotEqual(nonFavoriteMatch.Id, book.Id);
    }

    [Fact]
    public async Task FilterAndSort_WithoutFavoriteCondition_ReturnsFavoriteAndNonFavoriteBooks()
    {
        using var database = new TestDatabase();
        var favorite = database.AddBook(title: "Favorite");
        var nonFavorite = database.AddBook(title: "Not Favorite");
        favorite.SetIsFavorite(true);
        await database.Context.SaveChangesAsync();

        var books = await GetBooks(database, new SortRequest());

        Assert.Equal(
            new[] { nonFavorite.Id, favorite.Id },
            books.Select(book => book.Id));
    }

    [Fact]
    public async Task FilterAndSort_WithInvalidFilter_ReturnsBadRequest()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.FilterAndSort(
            new FilterRequest { MinPages = 0 },
            new SortRequest());

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task FilterAndSort_WithInvalidSort_ReturnsBadRequest()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.FilterAndSort(
            new FilterRequest(),
            new SortRequest
            {
                Field = (SortField)999,
                Order = SortOrder.Ascending
            });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateCurrentPage_WithInvalidPage_PreservesBadRequestBehavior()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100);

        var result = await database.Controller.UpdateCurrentPage(
            book.Id,
            new UpdateCurrentPageRequest { CurrentPage = 101 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateCurrentPage_WithMissingId_PreservesNotFoundBehavior()
    {
        using var database = new TestDatabase();

        var result = await database.Controller.UpdateCurrentPage(
            999,
            new UpdateCurrentPageRequest { CurrentPage = 1 });

        Assert.IsType<NotFoundResult>(result);
    }

    private static async Task<List<Book>> GetBooks(TestDatabase database, SortRequest sortRequest)
    {
        var result = await database.Controller.FilterAndSort(new FilterRequest(), sortRequest);
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsAssignableFrom<IEnumerable<Book>>(ok.Value).ToList();
    }

    private static IFormFile CreateFormFile(Stream stream, string fileName, string contentType)
    {
        return new FormFile(stream, 0, stream.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private static byte[] CreateImageBytes(string extension, int length = 0)
    {
        var signature = extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 },
            ".png" => new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A },
            ".webp" => "RIFF\0\0\0\0WEBP"u8.ToArray(),
            _ => throw new ArgumentOutOfRangeException(nameof(extension))
        };

        if (length == 0)
        {
            return signature;
        }

        var imageBytes = new byte[length];
        signature.CopyTo(imageBytes, 0);
        return imageBytes;
    }

    private static UpdateBookRequest ValidUpdateRequest()
    {
        return new UpdateBookRequest
        {
            Title = "Test Book",
            Genre = Genre.Fiction,
            TotalPages = 100,
            CurrentPage = 0,
            InterestLevel = InterestLevel.ModeratelyInterested
        };
    }

    private static CreateBookRequest ValidCreateRequest()
    {
        return new CreateBookRequest
        {
            Title = "Test Book",
            Genre = Genre.Fiction,
            TotalPages = 100,
            InterestLevel = InterestLevel.ModeratelyInterested
        };
    }

    private static void WaitForUtcClockToAdvance(DateTime timestamp)
    {
        Assert.True(SpinWait.SpinUntil(
            () => DateTime.UtcNow > timestamp,
            TimeSpan.FromSeconds(1)));
    }

    private sealed class TestDatabase : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly string _temporaryDirectory;

        public BookPickerDbContext Context { get; }
        public BooksController Controller { get; }
        public string WebRootPath { get; }
        public string CoversDirectoryPath => Path.Combine(WebRootPath, "uploads", "covers");

        public TestDatabase()
        {
            _temporaryDirectory = Path.Combine(
                Path.GetTempPath(),
                "BookPicker.Tests",
                Guid.NewGuid().ToString("N"));
            WebRootPath = Path.Combine(_temporaryDirectory, "wwwroot");
            Directory.CreateDirectory(WebRootPath);

            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();
            var options = new DbContextOptionsBuilder<BookPickerDbContext>()
                .UseSqlite(_connection)
                .Options;
            Context = new BookPickerDbContext(options);
            Context.Database.EnsureCreated();
            Controller = new BooksController(
                Context,
                new TestWebHostEnvironment(_temporaryDirectory, WebRootPath));
        }

        public Book AddBook(
            string title = "Test Book",
            Genre genre = Genre.Fiction,
            int totalPages = 100,
            int currentPage = 0,
            InterestLevel interestLevel = InterestLevel.ModeratelyInterested,
            string? coverImagePath = null)
        {
            var book = new Book(title, genre, totalPages, interestLevel, coverImagePath);
            if (currentPage > 0)
            {
                book.UpdateCurrentPageAndReadingStatus(currentPage);
            }

            Context.Books.Add(book);
            Context.SaveChanges();
            return book;
        }

        public void SetLastReadAt(Book book, DateTime? lastReadAt)
        {
            Context.Entry(book).Property(item => item.LastReadAt).CurrentValue = lastReadAt;
            Context.SaveChanges();
        }

        public string GetPhysicalPath(string webPath)
        {
            return Path.Combine(
                WebRootPath,
                webPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        }

        public string CreateWebRootFile(string webPath, byte[] contents)
        {
            var physicalPath = GetPhysicalPath(webPath);
            Directory.CreateDirectory(Path.GetDirectoryName(physicalPath)!);
            File.WriteAllBytes(physicalPath, contents);
            return physicalPath;
        }

        public void Dispose()
        {
            Context.Dispose();
            _connection.Dispose();

            if (Directory.Exists(_temporaryDirectory))
            {
                Directory.Delete(_temporaryDirectory, recursive: true);
            }
        }
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public TestWebHostEnvironment(string contentRootPath, string webRootPath)
        {
            ContentRootPath = contentRootPath;
            WebRootPath = webRootPath;
        }

        public string ApplicationName { get; set; } = "BookPicker.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; }
        public string EnvironmentName { get; set; } = "Testing";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; }
    }
}
