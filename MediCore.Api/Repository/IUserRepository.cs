using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IUserRepository
{
    Task<User> RegisterUserAsync(User user);
    Task<IEnumerable<User>> GetAllUserAsync();
    Task<User?> GetByIdAsync(string userId);
    Task<User?> GetByEmailAsync(string email);
    Task UpdateUserAsync(User user);
    Task<bool> DeleteUserAsync(string userId);
    Task<IEnumerable<User>> GetAllDoctorsAsync();
    Task<IEnumerable<User>> GetAllLabTechniciansAsync();
}
