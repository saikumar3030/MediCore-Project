using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IPaymentRepository
{
    Task<Payment?> GetByIdAsync(string paymentId);
    Task<IEnumerable<Payment>> GetByBillIdAsync(string billId);
    Task<decimal> GetTotalPaidAsync(string billId);
    Task AddAsync(Payment payment);
    Task UpdateAsync(Payment payment);
}
