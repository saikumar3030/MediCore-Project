using MediCore.Api.DTOs;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class IdentityMappers
{
    // Hashing of Password happens in the service — leave it empty here.
    public static User ToEntity(this RegisterRequestDto dto) => new()
    {
        UserName = dto.UserName,
        Email = dto.Email,
        Password = string.Empty,
        Role = Enum.Parse<RoleOption>(dto.Role, true),
        Status = Enum.Parse<StatusOption>(dto.Status, true)
    };

    public static UserResponseDto ToResponseDto(this User e) => new()
    {
        UserId = e.UserId,
        UserName = e.UserName,
        Email = e.Email,
        Role = e.Role.ToString(),
        Status = e.Status.ToString()
    };

    public static IEnumerable<UserResponseDto> ToResponseDtoList(this IEnumerable<User> users)
        => users.Select(ToResponseDto).ToList();
}
