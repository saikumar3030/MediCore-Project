using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _repository;

    public UserService(IUserRepository repository)
    {
        _repository = repository;
    }

    public async Task<UserResponseDto> RegisterUserAsync(RegisterRequestDto dto)
    {
        try
        {
            var emailExist = await _repository.GetByEmailAsync(dto.Email);
            if (emailExist != null)
                throw new IdentityServiceException(ErrorMessages.EmailAlreadyExists);

            var user = dto.ToEntity();
            user.UserId = IdGenerator.New();
            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var result = await _repository.RegisterUserAsync(user);
            return result.ToResponseDto();
        }
        catch (ArgumentException ex)
        {
            // Enum.Parse failures from IdentityMappers.ToEntity()
            throw new IdentityServiceException(ErrorMessages.InvalidRoleOrStatus(ex.Message));
        }
        catch (IdentityServiceException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new IdentityServiceException(ex.Message);
        }
    }

    public async Task<IEnumerable<UserResponseDto>> GetAllUserAsync()
    {
        var users = await _repository.GetAllUserAsync();
        return users.ToResponseDtoList();
    }

    public async Task<UserResponseDto?> GetByIdAsync(string userId)
    {
        var user = await _repository.GetByIdAsync(userId)
            ?? throw new IdentityServiceException(ErrorMessages.UserNotFound, 404);
        return user.ToResponseDto();
    }

    public async Task UpdateUserAsync(string userId, UserUpdateDto dto)
    {
        var user = await _repository.GetByIdAsync(userId)
            ?? throw new IdentityServiceException(ErrorMessages.UserNotFound, 404);

        // Partial update — only touch fields the caller actually sent. Callers
        // toggling status (e.g. re-activating an inactive user) don't need to
        // re-send UserName/Role.
        if (!string.IsNullOrWhiteSpace(dto.UserName))
            user.UserName = dto.UserName;
        if (!string.IsNullOrWhiteSpace(dto.Role))
            user.Role = Enum.Parse<RoleOption>(dto.Role, ignoreCase: true);
        if (!string.IsNullOrWhiteSpace(dto.Status))
            user.Status = Enum.Parse<StatusOption>(dto.Status, ignoreCase: true);

        await _repository.UpdateUserAsync(user);
    }

    // Soft delete: an "deleted" user is just flipped to Inactive — their row stays
    // in the database so audit trails and historical records keep referring to a
    // real user. Admin accounts are protected and cannot be soft-deleted.
    public async Task DeleteUserAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new IdentityServiceException(ErrorMessages.UserIdRequired);

        var user = await _repository.GetByIdAsync(userId)
            ?? throw new IdentityServiceException(ErrorMessages.UserNotFound, 404);

        if (user.Role == RoleOption.Admin)
            throw new IdentityServiceException(ErrorMessages.AdminCannotBeDeleted, 400);

        if (user.Status == StatusOption.Inactive) return; // already soft-deleted

        user.Status = StatusOption.Inactive;
        await _repository.UpdateUserAsync(user);
    }

    public async Task<IEnumerable<UserResponseDto>> GetAllDoctors()
    {
        var users = await _repository.GetAllDoctorsAsync();
        return users.ToResponseDtoList();
    }

    public async Task<IEnumerable<UserResponseDto>> GetAllLabTechnicians()
    {
        var users = await _repository.GetAllLabTechniciansAsync();
        return users.ToResponseDtoList();
    }
}
