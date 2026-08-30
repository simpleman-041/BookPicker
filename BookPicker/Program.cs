using BookPicker;
using BookPicker.Data;
using BookPicker.Models;
using BookPicker.Requests;
using BookPicker.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Threading.RateLimiting;

public partial class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var isRenderHosting = string.Equals(
            Environment.GetEnvironmentVariable("RENDER"),
            "true",
            StringComparison.OrdinalIgnoreCase);
        var renderPort = Environment.GetEnvironmentVariable("PORT");

        if (!string.IsNullOrWhiteSpace(renderPort))
        {
            if (!ushort.TryParse(renderPort, out var port) || port == 0)
            {
                throw new InvalidOperationException("PORT must be a valid TCP port number.");
            }

            builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
        }

        var useForwardedHeaders = builder.Configuration.GetValue<bool>("ForwardedHeaders:Enabled");
        if (useForwardedHeaders)
        {
            var trustedProxies = builder.Configuration
                .GetSection("ForwardedHeaders:KnownProxies")
                .Get<string[]>() ?? [];

            if (trustedProxies.Length == 0)
            {
                throw new InvalidOperationException(
                    "ForwardedHeaders:KnownProxies must contain the reverse proxy IP addresses when forwarded headers are enabled.");
            }

            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.ForwardLimit = 1;
                options.KnownIPNetworks.Clear();

                foreach (var trustedProxy in trustedProxies)
                {
                    if (!IPAddress.TryParse(trustedProxy, out var trustedProxyAddress))
                    {
                        throw new InvalidOperationException(
                            $"ForwardedHeaders:KnownProxies contains an invalid IP address: {trustedProxy}");
                    }

                    options.KnownProxies.Add(trustedProxyAddress);
                }
            });
        }

        var isDemoMode = DemoMode.IsEnabled(builder.Configuration);
        var connectionString = DemoMode.GetConnectionString(
            builder.Configuration,
            builder.Environment,
            isDemoMode);

        builder.Services.AddDbContext<BookPickerDbContext>(options =>
        {
            options.UseSqlite(connectionString);
        });
        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        Math.Ceiling(retryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
                }

                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { error = "Too many requests. Please try again later." },
                    cancellationToken: cancellationToken);
            };

            options.AddPolicy(RateLimitPolicies.Read, context =>
                CreateIpFixedWindowLimiter(context, permitLimit: 120));
            options.AddPolicy(RateLimitPolicies.Write, context =>
                CreateIpFixedWindowLimiter(context, permitLimit: 30));
            options.AddPolicy(RateLimitPolicies.CoverUpload, context =>
                CreateIpFixedWindowLimiter(context, permitLimit: 10));
        });

        var app = builder.Build();

        if (isDemoMode)
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<BookPickerDbContext>();
            DemoDatabaseInitializer.ApplyMigrationsAndSeed(dbContext);
        }

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        if (useForwardedHeaders)
        {
            app.UseForwardedHeaders();
        }

        // Render terminates HTTPS before forwarding HTTP traffic to the container.
        if (!isRenderHosting)
        {
            app.UseHttpsRedirection();
        }

        app.UseAuthorization();

        app.UseDefaultFiles();

        app.UseStaticFiles();

        app.UseRateLimiter();

        app.MapControllers();

        app.Run();
    }

    private static RateLimitPartition<string> CreateIpFixedWindowLimiter(HttpContext context, int permitLimit)
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            clientIp,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    }
}
