using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Domain.Data;

public class MediCoreDbContext : DbContext
{
    public MediCoreDbContext() { }
    public MediCoreDbContext(DbContextOptions<MediCoreDbContext> options) : base(options) { }

    // Identity
    public virtual DbSet<User> Users { get; set; } = null!;
    public virtual DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public virtual DbSet<AuditLog> AuditLogs { get; set; } = null!;

    // Patient
    public virtual DbSet<Patient> Patients { get; set; } = null!;
    public virtual DbSet<PatientDocument> PatientDocuments { get; set; } = null!;

    // Appointment
    public virtual DbSet<Appointment> Appointments { get; set; } = null!;
    public virtual DbSet<Schedule> Schedules { get; set; } = null!;

    // Billing
    public virtual DbSet<Bill> Bills { get; set; } = null!;
    public virtual DbSet<Payment> Payments { get; set; } = null!;
    public virtual DbSet<InsuranceClaim> InsuranceClaims { get; set; } = null!;

    // EMR
    public virtual DbSet<EMR> EMRs { get; set; } = null!;
    public virtual DbSet<Prescription> Prescriptions { get; set; } = null!;

    // Lab
    public virtual DbSet<LabTest> LabTests { get; set; } = null!;
    public virtual DbSet<LabReport> LabReports { get; set; } = null!;

    // Pharmacy
    public virtual DbSet<Medicine> Medicines { get; set; } = null!;
    public virtual DbSet<Dispense> Dispenses { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Store enums as strings for readability
        modelBuilder.Entity<User>()
            .Property(u => u.Role).HasConversion<string>();
        modelBuilder.Entity<User>()
            .Property(u => u.Status).HasConversion<string>();

        modelBuilder.Entity<Patient>()
            .HasKey(p => p.PatientID);
        modelBuilder.Entity<Patient>()
            .Property(p => p.PatientID).HasColumnType("varchar(4)");
        modelBuilder.Entity<Patient>()
            .Property(p => p.Gender).HasConversion<string>();

        modelBuilder.Entity<PatientDocument>()
            .Property(d => d.DocType).HasConversion<string>();

        // Patient <-> PatientDocument: one-to-many (a patient may upload
        // multiple ID/insurance/Aadhaar/passport scans).
        modelBuilder.Entity<PatientDocument>()
            .HasOne(d => d.Patient)
            .WithMany(p => p.Documents)
            .HasForeignKey(d => d.PatientID)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Appointment>()
            .Property(a => a.Status).HasConversion<string>();
        modelBuilder.Entity<Schedule>()
            .Property(s => s.Availability).HasConversion<string>();

        // Appointment <-> Schedule relation (Schedule has many Appointments)
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Schedule)
            .WithMany(s => s.Appointments)
            .HasForeignKey("ScheduleID")
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Bill>()
            .Property(b => b.Status).HasConversion<string>();
        modelBuilder.Entity<Payment>()
            .Property(p => p.Method).HasConversion<string>();
        modelBuilder.Entity<Payment>()
            .Property(p => p.Status).HasConversion<string>();
        modelBuilder.Entity<InsuranceClaim>()
            .Property(c => c.Status).HasConversion<string>();

        modelBuilder.Entity<EMR>()
            .Property(e => e.Status).HasConversion<string>();
        modelBuilder.Entity<Prescription>()
            .Property(p => p.Status).HasConversion<string>();

        modelBuilder.Entity<LabTest>()
            .Property(t => t.Type).HasConversion<string>();
        modelBuilder.Entity<LabTest>()
            .Property(t => t.Status).HasConversion<string>();
        modelBuilder.Entity<LabReport>()
            .Property(r => r.Status).HasConversion<string>();

        // LabTest <-> LabReport: 1-1 with FK on LabReport.TestID
        modelBuilder.Entity<LabTest>()
            .HasOne(t => t.Report)
            .WithOne(r => r.LabTest)
            .HasForeignKey<LabReport>(r => r.TestID)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Medicine>()
            .Property(m => m.Type).HasConversion<string>();
        modelBuilder.Entity<Medicine>()
            .Property(m => m.Status).HasConversion<string>();
        modelBuilder.Entity<Dispense>()
            .Property(d => d.Status).HasConversion<string>();
    }
}
