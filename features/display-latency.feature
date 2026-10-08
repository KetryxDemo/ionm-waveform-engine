Feature: Display latency budget

  @id:tc-display-latency-within-budget @tests:KXITM5W9KCZ7B428B2A0A3N8QHTGGW7
  Scenario: Samples are displayed within the 50 ms display latency budget
    Given an SSEP sample acquired at 1000 ms
    When it is displayed at 1050 ms
    Then the sample is within the display latency budget

  @id:tc-display-latency-late-sample-dropped @tests:KXITM5W9KCZ7B428B2A0A3N8QHTGGW7
  Scenario: Samples that would render past the budget are dropped, not shown late
    Given an SSEP sample acquired at 900 ms
    When the next display frame is scheduled at 1000 ms
    Then the sample is not rendered in that frame
