using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class EMRRepository : IEMRRepository
{
    private readonly MediCoreDbContext _context;

    public EMRRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<EMR?> GetByIdAsync(string emrId)
        => await _context.EMRs
            .Include(e => e.Prescriptions)
            .FirstOrDefaultAsync(e => e.EMRID == emrId);

    public async Task<IEnumerable<EMR>> GetByPatientIdAsync(string patientId)
        => await _context.EMRs
            .Include(e => e.Prescriptions)
            .Where(e => e.PatientID == patientId)
            .OrderByDescending(e => e.Date)
            .ToListAsync();

    public async Task<IEnumerable<EMR>> GetByDoctorIdAsync(string doctorId)
        => await _context.EMRs
            .Include(e => e.Prescriptions)
            .Where(e => e.DoctorID == doctorId)
            .OrderByDescending(e => e.Date)
            .ToListAsync();

    public async Task AddAsync(EMR emr)
    {
        await _context.EMRs.AddAsync(emr);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(EMR emr)
    {
        emr.UpdatedAt = DateTime.UtcNow;
        _context.EMRs.Update(emr);
        await _context.SaveChangesAsync();
    }
}
