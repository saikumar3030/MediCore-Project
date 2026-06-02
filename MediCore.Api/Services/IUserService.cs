using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IUserService
{
    Task<UserResponseDto> RegisterUserAsync(RegisterRequestDto dto);
    Task<IEnumerable<UserResponseDto>> GetAllUserAsync();
    Task<UserResponseDto?> GetByIdAsync(string userId);
    Task UpdateUserAsync(string userId, UserUpdateDto dto);
    Task DeleteUserAsync(string userId);
    Task<IEnumerable<UserResponseDto>> GetAllDoctors();
    Task<IEnumerable<UserResponseDto>> GetAllLabTechnicians();
}
