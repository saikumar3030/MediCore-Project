using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MediCore.Api.DTOs;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Exceptions;
using Microsoft.IdentityModel.Tokens;

namespace MediCore.Api.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly ITokenRepository _tokenRepository;

    public AuthService(IUserRepository userRepository, IConfiguration configuration, ITokenRepository tokenRepository)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _tokenRepository = tokenRepository;
    }

    // Verifies email + password, then issues a JWT access token (~minutes-lived)
    // and a refresh token (7 days). Refresh tokens are stored server-side so we
    // can revoke them on use.
    public async Task<(string UserId, LoginResponseDto result)> LoginAsync(LoginDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email)
            ?? throw new IdentityServiceException(ErrorMessages.InvalidEmail);

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
            throw new IdentityServiceException(ErrorMessages.InvalidPassword);

        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();

        await _tokenRepository.AddRefreshTokenAsync(new RefreshToken
        {
            Token = refreshToken,
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            UserId = user.UserId
        });

        var response = new LoginResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            LoginAt = DateTime.UtcNow,
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.Email,
            Role = user.Role.ToString()
        };

        return (user.UserId, response);
    }

    // Trades a valid (unrevoked, unexpired) refresh token for a fresh access +
    // refresh token pair. The old refresh token is revoked, so each one is
    // single-use.
    public async Task<LoginResponseDto> RefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _tokenRepository.GetRefreshTokenAsync(refreshToken);
        if (storedToken == null || storedToken.IsRevoked || storedToken.ExpiryDate < DateTime.UtcNow)
            throw new IdentityServiceException(ErrorMessages.InvalidRefreshToken);

        var user = await _userRepository.GetByIdAsync(storedToken.UserId);
        if (user == null)
        {
            throw new IdentityServiceException(ErrorMessages.UserNotFound);
        }

        var newAccessToken = GenerateAccessToken(user);
        storedToken.IsRevoked = true;
        var newRefreshToken = GenerateRefreshToken();

        await _tokenRepository.AddRefreshTokenAsync(new RefreshToken
        {
            Token = newRefreshToken,
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            UserId = storedToken.UserId
        });

        return new LoginResponseDto
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            LoginAt = DateTime.UtcNow
        };
    }

    private string GenerateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId),
            new Claim(ClaimTypes.Name, user.UserName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpiryMinutes"]!)),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
