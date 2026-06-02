using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface ILabReportRepository
{
    Task<LabReport?> GetByTestIdAsync(string testId);
    Task AddAsync(LabReport report);
    Task UpdateAsync(LabReport report);
    Task DeleteAsync(LabReport report);
}
