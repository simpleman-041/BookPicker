using BookPicker.Data;
using BookPicker.Models;
using BookPicker.Requests;
using BookPicker.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public partial class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddDbContext<BookPickerDbContext>(options =>
        {
            options.UseSqlite(builder.Configuration.GetConnectionString("BookDatabase"));
        });
        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();

        app.UseAuthorization();

        app.MapControllers();

        // MapPostはControllersとRunの間に配置する必要がある
        app.MapPost("/test-book-save", async (CreateBookRequest request, BookPickerDbContext dbContext) =>
        {
            Book book = new Book(request.Title, request.Genre, request.TotalPages, request.InterestLevel);
            dbContext.Books.Add(book);
            await dbContext.SaveChangesAsync();
            return Results.Ok($"Book '{book.Title}' saved successfully with ID {book.Id}.");
        });

        app.MapGet("/books/{id}", async(int id, BookPickerDbContext dbContext) =>
        {
            var book = await dbContext.Books.FindAsync(id);

            if (book is null) return Results.NotFound();

            return Results.Ok(book);
        });

        app.MapDelete("/books/{id}", async (int id, BookPickerDbContext dbContext) =>
        {
            var book = await dbContext.Books.FindAsync(id);
            if (book is null) return Results.NotFound();
            dbContext.Books.Remove(book);
            await dbContext.SaveChangesAsync();
            return Results.Ok($"Book '{book.Title}' deleted successfully.");
        });

        app.MapPut("/books/{id}/progress", async (int id, UpdateCurrentPageRequest request, BookPickerDbContext dbContext) =>
        {
            var book = await dbContext.Books.FindAsync(id);
            if (book is null) return Results.NotFound();
            book.UpdateCurrentPageAndReadingStatus(request.CurrentPage);
            await dbContext.SaveChangesAsync();
            return Results.Ok($"Book '{book.Title}' updated successfully.");
        });

        app.Run();
    }
}