namespace MediCore.Api.DTOs;

public class RequestPatientDto
{
    public required string PatientID { get; set; }
    public DateOnly DOB { get; set; }
    public int Gender { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? InsuranceID { get; set; }
}

public class ResponsePatientDto
{
    public required string PatientID { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public DateOnly DOB { get; set; }
    public int Gender { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? InsuranceID { get; set; }
    public bool Status { get; set; }
}

public class UpdatePatientDto
{
    public required string PatientID { get; set; }
    public DateOnly DOB { get; set; }
    public int Gender { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? InsuranceID { get; set; }
}

public class ResponsePatientDocumentDto
{
    public string DocumentID { get; set; } = string.Empty;
    public required string PatientID { get; set; }
    public int DocType { get; set; }
    public string? FileURI { get; set; }
    public string? FileName { get; set; }
    public DateTime UploadedDate { get; set; }
}



public class UploadPatientDocumentRequest
{
    public IFormFile File { get; set; } = null!;
    public int DocType { get; set; }
}