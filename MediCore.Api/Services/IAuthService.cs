using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IAuthService
{
    Task<(string UserId, LoginResponseDto result)> LoginAsync(LoginDto dto);
    Task<LoginResponseDto> RefreshTokenAsync(string refreshToken);
}
