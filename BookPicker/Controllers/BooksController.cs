using BookPicker.Data;
using Microsoft.AspNetCore.Mvc;

namespace BookPicker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BooksController : ControllerBase
    {
        // コンストラクタで受け取った BookPickerDbContext をプライベートフィールドに格納しておく
        private readonly BookPickerDbContext _dbContext;

        public BooksController(BookPickerDbContext dbContext)
        {
            _dbContext = dbContext;
        }

    }
}
