using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookPicker.Migrations
{
    /// <inheritdoc />
    public partial class AddIsFavoriteToBooks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFavorite",
                table: "Books",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFavorite",
                table: "Books");
        }
    }
}
