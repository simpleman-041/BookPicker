using BookPicker.Models;
using Microsoft.EntityFrameworkCore;

namespace BookPicker.Data;

public static class DemoDatabaseInitializer
{
    public static void ApplyMigrationsAndSeed(BookPickerDbContext dbContext)
    {
        dbContext.Database.Migrate();

        if (dbContext.Books.Any())
        {
            return;
        }

        dbContext.Books.AddRange(CreateDemoBooks());
        dbContext.SaveChanges();
    }

    private static IReadOnlyList<Book> CreateDemoBooks()
    {
        var unread = new Book(
            "静かな惑星の観測記録",
            Genre.SciFi,
            320,
            InterestLevel.NotInterested);

        var earlyStage = new Book(
            "毎日を整える小さな習慣",
            Genre.SelfHelp,
            220,
            InterestLevel.SlightlyInterested);
        earlyStage.UpdateCurrentPageAndReadingStatus(36);

        var midWay = new Book(
            "問題解決の設計図",
            Genre.Business,
            280,
            InterestLevel.ModeratelyInterested);
        midWay.UpdateCurrentPageAndReadingStatus(148);

        var lateStage = new Book(
            "北の港町ミステリー",
            Genre.Mystery,
            360,
            InterestLevel.PrimaryInterest);
        lateStage.UpdateCurrentPageAndReadingStatus(288);
        lateStage.SetIsFavorite(true);

        var completed = new Book(
            "料理で旅する世界",
            Genre.Cooking,
            140,
            InterestLevel.HighlyInterested);
        completed.SetIsCompleted(true);

        var favorite = new Book(
            "データで読む都市の未来",
            Genre.Technology,
            520,
            InterestLevel.ModeratelyInterested);
        favorite.UpdateCurrentPageAndReadingStatus(260);
        favorite.SetIsFavorite(true);

        var nearlyFinished = new Book(
            "休日の美術館さんぽ",
            Genre.Art,
            180,
            InterestLevel.HighlyInterested);
        nearlyFinished.UpdateCurrentPageAndReadingStatus(126);

        return [
            unread,
            earlyStage,
            midWay,
            lateStage,
            completed,
            favorite,
            nearlyFinished
        ];
    }
}
