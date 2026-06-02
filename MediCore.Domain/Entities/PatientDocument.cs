using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class PatientDocument
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string DocumentID { get; set; } = string.Empty;
    public string PatientID { get; set; } = null!;
    public DocTypeOption DocType { get; set; }
    public string FileURI { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public DateTime UploadedDate { get; set; }

    [ForeignKey("PatientID")]
    public Patient? Patient { get; set; }
}
