using MediCore.Api.Utilities;
using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class PatientDocumentRepository : IPatientDocumentRepository
{
    private readonly MediCoreDbContext _context;

    public PatientDocumentRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task DeleteDocumentAsync(string documentId)
    {
        var document = await GetDocumentByIdAsync(documentId)
            ?? throw new PatientException(ErrorMessages.PatientDocumentNotFound, 404);
        _context.PatientDocuments.Remove(document);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<PatientDocument>> GetAllDocumentAsync()
        => await _context.PatientDocuments.ToListAsync();

    public async Task<PatientDocument?> GetDocumentByIdAsync(string documentId)
        => await _context.PatientDocuments.FirstOrDefaultAsync(p => p.DocumentID == documentId);

    public async Task UploadDocumentAsync(PatientDocument document)
    {
        _context.PatientDocuments.Add(document);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<PatientDocument>> GetDocumentsByPatientIdAsync(string patientId)
        => await _context.PatientDocuments
            .Where(d => d.PatientID == patientId)
            .OrderByDescending(d => d.UploadedDate)
            .ToListAsync();
}
