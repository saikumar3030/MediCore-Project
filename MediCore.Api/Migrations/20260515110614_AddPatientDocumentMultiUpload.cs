using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediCore.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientDocumentMultiUpload : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PatientDocuments_PatientID",
                table: "PatientDocuments");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDocuments_PatientID",
                table: "PatientDocuments",
                column: "PatientID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PatientDocuments_PatientID",
                table: "PatientDocuments");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDocuments_PatientID",
                table: "PatientDocuments",
                column: "PatientID",
                unique: true);
        }
    }
}
