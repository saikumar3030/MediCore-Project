using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface ITokenRepository
{
    Task AddRefreshTokenAsync(RefreshToken refreshToken);
    Task<RefreshToken?> GetRefreshTokenAsync(string token);
}
