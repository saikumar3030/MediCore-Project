using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IPatientDocumentRepository
{
    Task UploadDocumentAsync(PatientDocument document);
    Task<IEnumerable<PatientDocument>> GetAllDocumentAsync();
    Task<PatientDocument?> GetDocumentByIdAsync(string documentId);
    Task DeleteDocumentAsync(string documentId);
    Task<IEnumerable<PatientDocument>> GetDocumentsByPatientIdAsync(string patientId);
}
