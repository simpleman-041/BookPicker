using BookPicker.Models;

namespace BookPicker.Tests.Models;

public class BookTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("\t\r\n")]
    public void Constructor_RejectsNullEmptyOrWhitespaceTitle(string? title)
    {
        Assert.Throws<ArgumentException>(() => CreateBook(title!));
    }

    [Fact]
    public void Constructor_AcceptsTitleAtMaximumLength()
    {
        var title = new string('a', 100);

        var book = CreateBook(title);

        Assert.Equal(title, book.Title);
    }

    [Fact]
    public void Constructor_RejectsTitleLongerThanMaximumLength()
    {
        var title = new string('a', 101);

        Assert.Throws<ArgumentException>(() => CreateBook(title));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(10001)]
    public void Constructor_RejectsTotalPagesOutsideAllowedRange(int totalPages)
    {
        Assert.Throws<ArgumentException>(() => CreateBook(totalPages: totalPages));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(10000)]
    public void Constructor_AcceptsTotalPagesAtAllowedBoundaries(int totalPages)
    {
        var book = CreateBook(totalPages: totalPages);

        Assert.Equal(totalPages, book.TotalPages);
    }

    [Fact]
    public void Constructor_RejectsUndefinedGenre()
    {
        var undefinedGenre = (Genre)(-1);

        Assert.Throws<ArgumentException>(() => CreateBook(genre: undefinedGenre));
    }

    [Fact]
    public void Constructor_RejectsUndefinedInterestLevel()
    {
        var undefinedInterestLevel = (InterestLevel)(-1);

        Assert.Throws<ArgumentException>(() => CreateBook(interestLevel: undefinedInterestLevel));
    }

    [Fact]
    public void UpdateCurrentPageAndReadingStatus_RejectsNegativeCurrentPage()
    {
        var book = CreateBook();

        Assert.Throws<ArgumentException>(() => book.UpdateCurrentPageAndReadingStatus(-1));
    }

    [Fact]
    public void UpdateCurrentPageAndReadingStatus_RejectsCurrentPageGreaterThanTotalPages()
    {
        var book = CreateBook(totalPages: 100);

        Assert.Throws<ArgumentException>(() => book.UpdateCurrentPageAndReadingStatus(101));
    }

    [Fact]
    public void UpdateCurrentPageAndReadingStatus_SetsNotStartedAtZeroPages()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(1);

        book.UpdateCurrentPageAndReadingStatus(0);

        Assert.Equal(ReadingStatus.NotStarted, book.ReadingStatus);
    }

    [Theory]
    [InlineData(32, ReadingStatus.EarlyStage)]
    [InlineData(33, ReadingStatus.MidWay)]
    public void UpdateCurrentPageAndReadingStatus_UsesExistingThirtyThreePercentBoundary(
        int currentPage,
        ReadingStatus expectedStatus)
    {
        var book = CreateBook(totalPages: 100);

        book.UpdateCurrentPageAndReadingStatus(currentPage);

        Assert.Equal(expectedStatus, book.ReadingStatus);
    }

    [Theory]
    [InlineData(65, ReadingStatus.MidWay)]
    [InlineData(66, ReadingStatus.LateStage)]
    public void UpdateCurrentPageAndReadingStatus_UsesExistingSixtySixPercentBoundary(
        int currentPage,
        ReadingStatus expectedStatus)
    {
        var book = CreateBook(totalPages: 100);

        book.UpdateCurrentPageAndReadingStatus(currentPage);

        Assert.Equal(expectedStatus, book.ReadingStatus);
    }

    [Fact]
    public void ReachingFinalPage_DoesNotAutomaticallyCompleteBook()
    {
        var book = CreateBook(totalPages: 100);

        book.UpdateCurrentPageAndReadingStatus(100);

        Assert.False(book.IsCompleted);
        Assert.Equal(ReadingStatus.LateStage, book.ReadingStatus);
    }

    [Fact]
    public void SetIsCompleted_AtFinalPage_SetsCompletedStatus()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(100);

        book.SetIsCompleted(true);

        Assert.True(book.IsCompleted);
        Assert.Equal(ReadingStatus.Completed, book.ReadingStatus);
    }

    [Fact]
    public void SetIsCompleted_BeforeFinalPage_DoesNotCompleteBook()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(50);

        book.SetIsCompleted(true);

        Assert.False(book.IsCompleted);
        Assert.Equal(ReadingStatus.MidWay, book.ReadingStatus);
    }

    [Fact]
    public void MovingBackFromFinalPage_ClearsCompletionAndRecalculatesReadingStatus()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(100);
        book.SetIsCompleted(true);

        book.UpdateCurrentPageAndReadingStatus(50);

        Assert.False(book.IsCompleted);
        Assert.Equal(ReadingStatus.MidWay, book.ReadingStatus);
    }

    [Fact]
    public void Constructor_InitializesLastReadAtToNull()
    {
        var book = CreateBook();

        Assert.Null(book.LastReadAt);
    }

    [Fact]
    public void UpdateCurrentPageAndReadingStatus_WhenCurrentPageIncreases_SetsCurrentUtcTimeAsLastReadAt()
    {
        var beforeUpdate = DateTime.UtcNow;

        var book = CreateBook();
        book.UpdateCurrentPageAndReadingStatus(1);

        var afterUpdate = DateTime.UtcNow;
        Assert.NotNull(book.LastReadAt);
        Assert.Equal(DateTimeKind.Utc, book.LastReadAt.Value.Kind);
        Assert.InRange(book.LastReadAt.Value, beforeUpdate, afterUpdate);
    }

    [Theory]
    [InlineData(50)]
    [InlineData(40)]
    public void UpdateCurrentPageAndReadingStatus_WhenCurrentPageDoesNotIncrease_DoesNotChangeLastReadAt(
        int newCurrentPage)
    {
        var book = CreateBook();
        book.UpdateCurrentPageAndReadingStatus(50);
        var previousLastReadAt = book.LastReadAt!.Value;
        WaitForUtcClockToAdvance(previousLastReadAt);

        book.UpdateCurrentPageAndReadingStatus(newCurrentPage);

        Assert.Equal(previousLastReadAt, book.LastReadAt);
    }

    [Fact]
    public void UpdateDetails_WhenCurrentPageIncreases_UpdatesLastReadAt()
    {
        var book = CreateBook();
        book.UpdateCurrentPageAndReadingStatus(10);
        var previousLastReadAt = book.LastReadAt!.Value;
        WaitForUtcClockToAdvance(previousLastReadAt);
        var beforeUpdate = DateTime.UtcNow;

        book.UpdateDetails(
            book.Title,
            book.Genre,
            book.TotalPages,
            20,
            book.InterestLevel,
            book.CoverImagePath);

        var afterUpdate = DateTime.UtcNow;
        Assert.True(book.LastReadAt > previousLastReadAt);
        Assert.InRange(book.LastReadAt!.Value, beforeUpdate, afterUpdate);
    }

    [Theory]
    [InlineData(50)]
    [InlineData(40)]
    public void UpdateDetails_WhenCurrentPageDoesNotIncrease_DoesNotChangeLastReadAt(int newCurrentPage)
    {
        var book = CreateBook();
        book.UpdateCurrentPageAndReadingStatus(50);
        var previousLastReadAt = book.LastReadAt!.Value;
        WaitForUtcClockToAdvance(previousLastReadAt);

        book.UpdateDetails(
            book.Title,
            book.Genre,
            book.TotalPages,
            newCurrentPage,
            book.InterestLevel,
            book.CoverImagePath);

        Assert.Equal(previousLastReadAt, book.LastReadAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("\t\r\n")]
    public void Constructor_NormalizesMissingCoverImagePathToNull(string? coverImagePath)
    {
        var book = CreateBook(coverImagePath: coverImagePath);

        Assert.Null(book.CoverImagePath);
    }

    [Theory]
    [InlineData("/images/covers/book.jpg")]
    [InlineData("http://example.com/book.jpg")]
    [InlineData("https://example.com/book.jpg")]
    public void Constructor_PreservesSpecifiedCoverImagePath(string coverImagePath)
    {
        var book = CreateBook(coverImagePath: coverImagePath);

        Assert.Equal(coverImagePath, book.CoverImagePath);
    }

    [Fact]
    public void UpdateDetails_UpdatesAllEditableValuesUsingValidFinalPageState()
    {
        var book = CreateBook(totalPages: 500, coverImagePath: "/images/old.jpg");
        book.UpdateCurrentPageAndReadingStatus(400);

        book.UpdateDetails(
            "Updated Book",
            Genre.Science,
            300,
            250,
            InterestLevel.PrimaryInterest,
            "https://example.com/new.jpg");

        Assert.Equal("Updated Book", book.Title);
        Assert.Equal(Genre.Science, book.Genre);
        Assert.Equal(300, book.TotalPages);
        Assert.Equal(250, book.CurrentPage);
        Assert.Equal(InterestLevel.PrimaryInterest, book.InterestLevel);
        Assert.Equal("https://example.com/new.jpg", book.CoverImagePath);
    }

    [Fact]
    public void UpdateDetails_WhenFinalCurrentPageExceedsTotalPages_RejectsWithoutChangingState()
    {
        var book = CreateBook(totalPages: 100, coverImagePath: "/images/old.jpg");
        book.UpdateCurrentPageAndReadingStatus(40);
        var previousTitle = book.Title;
        var previousGenre = book.Genre;
        var previousTotalPages = book.TotalPages;
        var previousCurrentPage = book.CurrentPage;
        var previousInterestLevel = book.InterestLevel;
        var previousCoverImagePath = book.CoverImagePath;
        var previousIsCompleted = book.IsCompleted;
        var previousReadingStatus = book.ReadingStatus;
        var previousLastReadAt = book.LastReadAt;

        Assert.Throws<ArgumentException>(() => book.UpdateDetails(
            "Changed Book",
            Genre.Science,
            30,
            40,
            InterestLevel.PrimaryInterest,
            "/images/new.jpg"));

        Assert.Equal(previousTitle, book.Title);
        Assert.Equal(previousGenre, book.Genre);
        Assert.Equal(previousTotalPages, book.TotalPages);
        Assert.Equal(previousCurrentPage, book.CurrentPage);
        Assert.Equal(previousInterestLevel, book.InterestLevel);
        Assert.Equal(previousCoverImagePath, book.CoverImagePath);
        Assert.Equal(previousIsCompleted, book.IsCompleted);
        Assert.Equal(previousReadingStatus, book.ReadingStatus);
        Assert.Equal(previousLastReadAt, book.LastReadAt);
    }

    [Fact]
    public void UpdateDetails_WhenCurrentPageBecomesLessThanTotalPages_ClearsCompletion()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(100);
        book.SetIsCompleted(true);

        book.UpdateDetails(
            book.Title,
            book.Genre,
            100,
            90,
            book.InterestLevel,
            book.CoverImagePath);

        Assert.False(book.IsCompleted);
    }

    [Fact]
    public void UpdateDetails_WhenCurrentPageReachesTotalPages_DoesNotAutomaticallyCompleteBook()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(90);

        book.UpdateDetails(
            book.Title,
            book.Genre,
            100,
            100,
            book.InterestLevel,
            book.CoverImagePath);

        Assert.False(book.IsCompleted);
        Assert.Equal(ReadingStatus.LateStage, book.ReadingStatus);
    }

    [Fact]
    public void UpdateDetails_RecalculatesReadingStatusFromFinalState()
    {
        var book = CreateBook(totalPages: 100);
        book.UpdateCurrentPageAndReadingStatus(10);

        book.UpdateDetails(
            book.Title,
            book.Genre,
            200,
            100,
            book.InterestLevel,
            book.CoverImagePath);

        Assert.Equal(ReadingStatus.MidWay, book.ReadingStatus);
    }

    private static void WaitForUtcClockToAdvance(DateTime timestamp)
    {
        Assert.True(SpinWait.SpinUntil(
            () => DateTime.UtcNow > timestamp,
            TimeSpan.FromSeconds(1)));
    }

    private static Book CreateBook(
        string title = "Test Book",
        Genre genre = Genre.Fiction,
        int totalPages = 100,
        InterestLevel interestLevel = InterestLevel.ModeratelyInterested,
        string? coverImagePath = null)
    {
        return new Book(title, genre, totalPages, interestLevel, coverImagePath);
    }
}
