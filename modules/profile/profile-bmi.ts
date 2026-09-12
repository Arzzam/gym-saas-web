export function computeProfileBmi(heightCm: number | null, weightKg: number | null): number | null {
    if (heightCm === null || weightKg === null || heightCm <= 0) {
        return null;
    }
    const metres = heightCm / 100;
    return Math.round((weightKg / (metres * metres)) * 10) / 10;
}
