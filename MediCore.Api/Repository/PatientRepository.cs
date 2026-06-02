using MediCore.Api.Utilities;
using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class PatientRepository : IPatientRepository
{
    private readonly MediCoreDbContext _context;

    public PatientRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Patient patient)
    {
        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(string patientId)
    {
        var patient = await GetByIdAsync(patientId)
            ?? throw new PatientException(ErrorMessages.PatientNotFound, 404);
        patient.Status = false;
        _context.Patients.Update(patient);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Patient>> GetAllAsync()
        => await _context.Patients.ToListAsync();

    public async Task<Patient?> GetByIdAsync(string patientId)
        => await _context.Patients.FirstOrDefaultAsync(p => p.PatientID == patientId && p.Status);

    // Admin update flows (e.g. reactivating a soft-deleted patient) need to
    // fetch the row regardless of Status, otherwise the user can never be
    // brought back from Inactive.
    public async Task<Patient?> GetByIdIncludingInactiveAsync(string patientId)
        => await _context.Patients.FirstOrDefaultAsync(p => p.PatientID == patientId);

    public async Task UpdateAsync(Patient patient)
    {
        _context.Patients.Update(patient);
        await _context.SaveChangesAsync();
    }
}
