using BookPicker.Controllers;
using BookPicker.Data;
using BookPicker.Models;
using BookPicker.Requests;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace BookPicker.Tests.Controllers;

public class BooksControllerTests
{
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
    public async Task UpdateCompletion_AtFinalPage_CompletesBookAndReturnsNoContent()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 100);

        var result = await database.Controller.UpdateCompletion(
            book.Id,
            new UpdateCompletionRequest { IsCompleted = true });

        Assert.IsType<NoContentResult>(result);
        Assert.True(book.IsCompleted);
        Assert.Equal(ReadingStatus.Completed, book.ReadingStatus);
    }

    [Fact]
    public async Task UpdateCompletion_BeforeFinalPage_ReturnsBadRequestWithoutCompletingBook()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 99);

        var result = await database.Controller.UpdateCompletion(
            book.Id,
            new UpdateCompletionRequest { IsCompleted = true });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.False(book.IsCompleted);
        Assert.Equal(ReadingStatus.LateStage, book.ReadingStatus);
    }

    [Fact]
    public async Task UpdateCompletion_WithFalse_ClearsCompletionAndReturnsNoContent()
    {
        using var database = new TestDatabase();
        var book = database.AddBook(totalPages: 100, currentPage: 100);
        book.SetIsCompleted(true);
        await database.Context.SaveChangesAsync();

        var result = await database.Controller.UpdateCompletion(
            book.Id,
            new UpdateCompletionRequest { IsCompleted = false });

        Assert.IsType<NoContentResult>(result);
        Assert.False(book.IsCompleted);
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

        public BookPickerDbContext Context { get; }
        public BooksController Controller { get; }

        public TestDatabase()
        {
            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();
            var options = new DbContextOptionsBuilder<BookPickerDbContext>()
                .UseSqlite(_connection)
                .Options;
            Context = new BookPickerDbContext(options);
            Context.Database.EnsureCreated();
            Controller = new BooksController(Context);
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

        public void Dispose()
        {
            Context.Dispose();
            _connection.Dispose();
        }
    }
}
