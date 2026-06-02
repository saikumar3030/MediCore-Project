using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class PaymentRepository : IPaymentRepository
{
    private readonly MediCoreDbContext _context;

    public PaymentRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Payment?> GetByIdAsync(string paymentId)
        => await _context.Payments
            .Include(p => p.Bill)
            .FirstOrDefaultAsync(p => p.PaymentID == paymentId);

    public async Task<IEnumerable<Payment>> GetByBillIdAsync(string billId)
        => await _context.Payments
            .Where(p => p.BillID == billId)
            .OrderByDescending(p => p.Date)
            .ToListAsync();

    public async Task<decimal> GetTotalPaidAsync(string billId)
        => await _context.Payments
            .Where(p => p.BillID == billId && p.Status == PaymentStatus.Completed)
            .SumAsync(p => p.Amount);

    public async Task AddAsync(Payment payment)
    {
        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Payment payment)
    {
        payment.UpdatedAt = DateTime.UtcNow;
        _context.Payments.Update(payment);
        await _context.SaveChangesAsync();
    }
}
