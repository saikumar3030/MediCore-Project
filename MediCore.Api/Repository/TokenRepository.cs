using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class TokenRepository : ITokenRepository
{
    private readonly MediCoreDbContext _context;

    public TokenRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task AddRefreshTokenAsync(RefreshToken refreshToken)
    {
        await _context.RefreshTokens.AddAsync(refreshToken);
        await _context.SaveChangesAsync();
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token)
        => await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token);
}
