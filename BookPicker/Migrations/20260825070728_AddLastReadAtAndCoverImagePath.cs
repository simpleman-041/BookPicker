using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookPicker.Migrations
{
    /// <inheritdoc />
    public partial class AddLastReadAtAndCoverImagePath : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverImagePath",
                table: "Books",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReadAt",
                table: "Books",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoverImagePath",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LastReadAt",
                table: "Books");
        }
    }
}
