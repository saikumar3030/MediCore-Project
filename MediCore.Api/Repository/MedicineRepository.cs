using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class MedicineRepository : IMedicineRepository
{
    private readonly MediCoreDbContext _context;

    public MedicineRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Medicine?> GetByIdAsync(string medicineId)
        => await _context.Medicines.FirstOrDefaultAsync(m => m.MedicineID == medicineId);

    public async Task<IEnumerable<Medicine>> GetAllAsync()
        => await _context.Medicines.OrderBy(m => m.Name).ToListAsync();

    public async Task AddAsync(Medicine medicine)
    {
        await _context.Medicines.AddAsync(medicine);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Medicine medicine)
    {
        medicine.UpdatedAt = DateTime.UtcNow;
        _context.Medicines.Update(medicine);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveAsync(Medicine medicine)
    {
        _context.Medicines.Remove(medicine);
        await _context.SaveChangesAsync();
    }
}
