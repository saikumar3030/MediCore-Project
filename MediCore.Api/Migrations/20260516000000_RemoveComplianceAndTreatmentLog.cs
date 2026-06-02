using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediCore.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveComplianceAndTreatmentLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "TreatmentLogs");
            migrationBuilder.DropTable(name: "ComplianceRecords");
            migrationBuilder.DropTable(name: "Audits");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Re-creating these tables is out of scope; if you need to roll back,
            // restore from a backup or regenerate from a model snapshot that
            // pre-dates this migration.
        }
    }
}
