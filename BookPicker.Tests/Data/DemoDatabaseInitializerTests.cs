using BookPicker.Data;
using BookPicker.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace BookPicker.Tests.Data;

public class DemoDatabaseInitializerTests
{
    [Fact]
    public void ApplyMigrationsAndSeed_CreatesSchemaAndSeedsOnlyOnce()
    {
        using var database = new DemoDatabase();

        DemoDatabaseInitializer.ApplyMigrationsAndSeed(database.Context);
        var seededBooks = database.Context.Books.OrderBy(book => book.Id).ToList();

        Assert.Equal(7, seededBooks.Count);
        Assert.Contains(seededBooks, book => book.ReadingStatus == ReadingStatus.NotStarted);
        Assert.Contains(seededBooks, book => book.ReadingStatus == ReadingStatus.EarlyStage);
        Assert.Contains(seededBooks, book => book.ReadingStatus == ReadingStatus.MidWay);
        Assert.Contains(seededBooks, book => book.ReadingStatus == ReadingStatus.LateStage);
        Assert.Contains(seededBooks, book => book.ReadingStatus == ReadingStatus.Completed);
        Assert.Contains(seededBooks, book => book.IsFavorite);
        Assert.All(
            seededBooks.Where(book => book.ReadingStatus != ReadingStatus.NotStarted),
            book => Assert.NotNull(book.LastReadAt));
        Assert.All(seededBooks, AssertBookInvariants);

        DemoDatabaseInitializer.ApplyMigrationsAndSeed(database.Context);

        Assert.Equal(7, database.Context.Books.Count());
        Assert.Equal(
            database.Context.Database.GetMigrations().ToList(),
            database.Context.Database.GetAppliedMigrations().ToList());
    }

    [Fact]
    public void ApplyMigrationsAndSeed_AssignsDedicatedStaticCoverImageToEveryDemoBook()
    {
        using var database = new DemoDatabase();

        DemoDatabaseInitializer.ApplyMigrationsAndSeed(database.Context);

        var expectedCoverImagePaths = new Dictionary<string, string>
        {
            ["休日の美術館さんぽ"] = "/images/demo-covers/demo_cover_01_museum.png",
            ["データで読む都市の未来"] = "/images/demo-covers/demo_cover_02_city.png",
            ["料理で旅する世界"] = "/images/demo-covers/demo_cover_03_food.png",
            ["北の港町ミステリー"] = "/images/demo-covers/demo_cover_04_mystery.png",
            ["問題解決の設計図"] = "/images/demo-covers/demo_cover_05_problem.png",
            ["毎日を整える小さな習慣"] = "/images/demo-covers/demo_cover_06_habits.png",
            ["静かな惑星の観測記録"] = "/images/demo-covers/demo_cover_07_observation.png"
        };

        var seededBooks = database.Context.Books.ToList();

        Assert.Equal(expectedCoverImagePaths.Count, seededBooks.Count);
        foreach (var seededBook in seededBooks)
        {
            Assert.Equal(
                expectedCoverImagePaths[seededBook.Title],
                seededBook.CoverImagePath);
        }
    }

    [Fact]
    public void IsEnabled_OnlyReturnsTrueForTrue()
    {
        Assert.True(DemoMode.IsEnabled(CreateConfiguration("true")));
        Assert.False(DemoMode.IsEnabled(CreateConfiguration("TRUE")));
        Assert.False(DemoMode.IsEnabled(CreateConfiguration("false")));
        Assert.False(DemoMode.IsEnabled(CreateConfiguration(null)));
    }

    [Fact]
    public void GetConnectionString_UsesSeparateDemoDatabaseOnlyInDemoMode()
    {
        using var database = new DemoDatabase();
        var configuration = CreateConfiguration("true");

        var demoConnectionString = DemoMode.GetConnectionString(
            configuration,
            database.Environment,
            isDemoMode: true);
        var normalConnectionString = DemoMode.GetConnectionString(
            configuration,
            database.Environment,
            isDemoMode: false);

        Assert.Contains(DemoMode.DemoDatabaseFileName, demoConnectionString);
        Assert.NotEqual("Data Source=bookpicker.db", demoConnectionString);
        Assert.Equal("Data Source=bookpicker.db", normalConnectionString);
    }

    private static IConfiguration CreateConfiguration(string? demoMode)
    {
        var values = new Dictionary<string, string?>
        {
            ["ConnectionStrings:BookDatabase"] = "Data Source=bookpicker.db"
        };

        if (demoMode != null)
        {
            values[DemoMode.EnvironmentVariableName] = demoMode;
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }

    private static void AssertBookInvariants(Book book)
    {
        Assert.InRange(book.CurrentPage, 0, book.TotalPages);

        if (book.IsCompleted)
        {
            Assert.Equal(book.TotalPages, book.CurrentPage);
            Assert.Equal(ReadingStatus.Completed, book.ReadingStatus);
        }
    }

    private sealed class DemoDatabase : IDisposable
    {
        private readonly string _directoryPath;

        public BookPickerDbContext Context { get; }
        public IHostEnvironment Environment { get; }

        public DemoDatabase()
        {
            _directoryPath = Path.Combine(
                Path.GetTempPath(),
                "BookPicker.Tests",
                Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_directoryPath);

            var options = new DbContextOptionsBuilder<BookPickerDbContext>()
                .UseSqlite(new SqliteConnectionStringBuilder
                {
                    DataSource = Path.Combine(_directoryPath, DemoMode.DemoDatabaseFileName),
                    Pooling = false
                }.ToString())
                .Options;
            Context = new BookPickerDbContext(options);
            Environment = new TestHostEnvironment(_directoryPath);
        }

        public void Dispose()
        {
            Context.Dispose();
            Directory.Delete(_directoryPath, recursive: true);
        }
    }

    private sealed class TestHostEnvironment(string contentRootPath) : IHostEnvironment
    {
        public string ApplicationName { get; set; } = "BookPicker.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = contentRootPath;
        public string EnvironmentName { get; set; } = "Testing";
    }
}
