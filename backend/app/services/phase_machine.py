class PhaseMachine:
    """
    Deterministic 4-phase flood escalation machine.
    Never auto-downgrades prematurely while water or forecast remains elevated.
    """
    STEP_DOWN = {"DANGER": "WARNING", "WARNING": "ADVISORY", "ADVISORY": "NORMAL"}

    def __init__(self, warn_level: float = 1.20, danger_level: float = 1.50):
        self.phase = "NORMAL"
        self.warn_level = warn_level
        self.danger_level = danger_level
        self.consecutive_danger = 0
        self.consecutive_safe = 0

    def update(self, current_m: float, forecast_p50_m: float | None = None, rain_2h_mm: float = 0.0) -> str:
        # Check highest threat indicator
        effective_level = current_m
        if forecast_p50_m is not None:
            effective_level = max(current_m, forecast_p50_m * 0.95)

        if effective_level >= self.danger_level or rain_2h_mm >= 120.0:
            self.phase = "DANGER"
            self.consecutive_danger += 1
            self.consecutive_safe = 0
        elif effective_level >= self.warn_level or rain_2h_mm >= 60.0:
            if self.phase != "DANGER":
                self.phase = "WARNING"
            self.consecutive_safe = 0
        else:
            # Below the warning line: step down one level after 3 calm readings in a row.
            in_band = effective_level >= (self.warn_level * 0.75)
            if in_band and self.phase == "NORMAL":
                self.phase = "ADVISORY"
            if self.phase != "NORMAL" and not (in_band and self.phase == "ADVISORY"):
                self.consecutive_safe += 1
                if self.consecutive_safe >= 3:
                    self.phase = self.STEP_DOWN[self.phase]
                    self.consecutive_safe = 0

        return self.phase
