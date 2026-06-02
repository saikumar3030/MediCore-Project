using MediCore.Api.DTOs;
using Microsoft.AspNetCore.Http;

namespace MediCore.Api.Services;

public interface IPatientDocumentService
{
    Task<ResponsePatientDocumentDto> UploadDocumentAsync(string patientId, int docType, IFormFile file);
    Task<IEnumerable<ResponsePatientDocumentDto>> GetAllDocumentAsync();
    Task<ResponsePatientDocumentDto?> GetDocumentByIdAsync(string documentId);
    Task DeleteDocumentAsync(string documentId);
    Task<IEnumerable<ResponsePatientDocumentDto>> GetDocumentsByPatientIdAsync(string patientId);
}
