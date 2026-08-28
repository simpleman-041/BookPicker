using Microsoft.Data.Sqlite;

namespace BookPicker.Data;

public static class DemoMode
{
    public const string EnvironmentVariableName = "YONDOKU_DEMO_MODE";
    public const string DemoDatabaseFileName = "demo-bookpicker.db";

    public static bool IsEnabled(IConfiguration configuration)
    {
        return string.Equals(
            configuration[EnvironmentVariableName],
            "true",
            StringComparison.Ordinal);
    }

    public static string GetConnectionString(
        IConfiguration configuration,
        IHostEnvironment environment,
        bool isDemoMode)
    {
        if (isDemoMode)
        {
            var demoDatabasePath = Path.Combine(
                environment.ContentRootPath,
                DemoDatabaseFileName);

            return new SqliteConnectionStringBuilder
            {
                DataSource = demoDatabasePath
            }.ToString();
        }

        return configuration.GetConnectionString("BookDatabase")
            ?? throw new InvalidOperationException(
                "Connection string 'BookDatabase' is not configured.");
    }
}
