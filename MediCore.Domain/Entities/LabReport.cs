using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class LabReport
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string ReportID { get; set; } = string.Empty;

    [Column(TypeName = "varchar(4)")]
    public string TestID { get; set; } = string.Empty;
    public string FileURI { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public LabReportStatus Status { get; set; } = LabReportStatus.Uploaded;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(TestID))]
    public LabTest LabTest { get; set; } = null!;
}
