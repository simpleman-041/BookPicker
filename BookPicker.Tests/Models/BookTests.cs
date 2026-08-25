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

    private static Book CreateBook(
        string title = "Test Book",
        Genre genre = Genre.Fiction,
        int totalPages = 100,
        InterestLevel interestLevel = InterestLevel.ModeratelyInterested)
    {
        return new Book(title, genre, totalPages, interestLevel);
    }
}
