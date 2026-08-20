using BookPicker.Models;
using Microsoft.EntityFrameworkCore;

namespace BookPicker.Data
{
    public class BookPickerDbContext : DbContext
    {
        public DbSet<Book> Books { get; set; }

        public BookPickerDbContext(DbContextOptions<BookPickerDbContext> options) : base(options) 
        {

        }
    }
}
