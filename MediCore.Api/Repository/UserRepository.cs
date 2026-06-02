using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class UserRepository : IUserRepository
{
    private readonly MediCoreDbContext _context;

    public UserRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<User> RegisterUserAsync(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<IEnumerable<User>> GetAllUserAsync()
        => await _context.Users.ToListAsync();

    public async Task<User?> GetByIdAsync(string userId)
        => await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);

    public async Task<User?> GetByEmailAsync(string email)
        => await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

    public async Task UpdateUserAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeleteUserAsync(string userId)
    {
        var user = await GetByIdAsync(userId);
        if (user == null) return false;
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<User>> GetAllDoctorsAsync()
        => await _context.Users
            .Where(u => u.Role == RoleOption.Doctor && u.Status == StatusOption.Active)
            .ToListAsync();

    public async Task<IEnumerable<User>> GetAllLabTechniciansAsync()
        => await _context.Users
            .Where(u => u.Role == RoleOption.Lab_Technician && u.Status == StatusOption.Active)
            .ToListAsync();
}
