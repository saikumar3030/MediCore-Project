using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class PrescriptionRepository : IPrescriptionRepository
{
    private readonly MediCoreDbContext _context;

    public PrescriptionRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Prescription?> GetByIdAsync(string prescriptionId)
        => await _context.Prescriptions
            .Include(p => p.EMR)
            .FirstOrDefaultAsync(p => p.PrescriptionID == prescriptionId);

    public async Task<IEnumerable<Prescription>> GetByEMRIdAsync(string emrId)
        => await _context.Prescriptions
            .Where(p => p.EMRID == emrId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Prescription>> GetIssuedAsync()
        => await _context.Prescriptions
            .Include(p => p.EMR)
            .Where(p => p.Status == PrescriptionStatus.Issued)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

    public async Task AddAsync(Prescription prescription)
    {
        await _context.Prescriptions.AddAsync(prescription);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Prescription prescription)
    {
        prescription.UpdatedAt = DateTime.UtcNow;
        _context.Prescriptions.Update(prescription);
        await _context.SaveChangesAsync();
    }
}
