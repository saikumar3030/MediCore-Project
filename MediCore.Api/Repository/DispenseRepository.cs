using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class DispenseRepository : IDispenseRepository
{
    private readonly MediCoreDbContext _context;

    public DispenseRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Dispense?> GetByIdAsync(string dispenseId)
        => await _context.Dispenses
            .Include(d => d.Medicine)
            .FirstOrDefaultAsync(d => d.DispenseID == dispenseId);

    public async Task<IEnumerable<Dispense>> GetAllAsync()
        => await _context.Dispenses
            .Include(d => d.Medicine)
            .OrderByDescending(d => d.Date)
            .ToListAsync();

    public async Task<Dispense?> GetByPrescriptionIdAsync(string prescriptionId)
        => await _context.Dispenses.FirstOrDefaultAsync(d =>
            d.PrescriptionID == prescriptionId &&
            d.Status == DispenseStatus.Dispensed);

    public async Task<bool> HasDispensesForMedicineAsync(string medicineId)
        => await _context.Dispenses.AnyAsync(d => d.MedicineID == medicineId);

    public async Task AddAsync(Dispense dispense)
    {
        await _context.Dispenses.AddAsync(dispense);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Dispense dispense)
    {
        dispense.UpdatedAt = DateTime.UtcNow;
        _context.Dispenses.Update(dispense);
        await _context.SaveChangesAsync();
    }
}
