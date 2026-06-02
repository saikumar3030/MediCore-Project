namespace MediCore.Api.Utilities;

// Generates short 4-character identifiers used as primary keys across the domain.
// Backed by the first 4 chars of a fresh GUID. Note: 16^4 = 65,536 unique values,
// so this is only safe at the current scale of the application.
public static class IdGenerator
{
    public static string New() => Guid.NewGuid().ToString("N")[..4];
}
