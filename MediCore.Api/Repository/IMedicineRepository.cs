using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IMedicineRepository
{
    Task<Medicine?> GetByIdAsync(string medicineId);
    Task<IEnumerable<Medicine>> GetAllAsync();
    Task AddAsync(Medicine medicine);
    Task UpdateAsync(Medicine medicine);
    Task RemoveAsync(Medicine medicine);
}
