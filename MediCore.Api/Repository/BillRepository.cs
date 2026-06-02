using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class BillRepository : IBillRepository
{
    private readonly MediCoreDbContext _context;

    public BillRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Bill?> GetByIdAsync(string billId)
        => await _context.Bills
            .Include(b => b.Payments)
            .Include(b => b.InsuranceClaims)
            .FirstOrDefaultAsync(b => b.BillID == billId);

    public async Task<IEnumerable<Bill>> GetAllAsync()
        => await _context.Bills
            .Include(b => b.Payments)
            .Include(b => b.InsuranceClaims)
            .OrderByDescending(b => b.Date)
            .ToListAsync();

    public async Task<IEnumerable<Bill>> GetByPatientIdAsync(string patientId)
        => await _context.Bills
            .Include(b => b.Payments)
            .Include(b => b.InsuranceClaims)
            .Where(b => b.PatientID == patientId)
            .OrderByDescending(b => b.Date)
            .ToListAsync();

    public async Task AddAsync(Bill bill)
    {
        await _context.Bills.AddAsync(bill);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Bill bill)
    {
        bill.UpdatedAt = DateTime.UtcNow;
        _context.Bills.Update(bill);
        await _context.SaveChangesAsync();
    }
}
