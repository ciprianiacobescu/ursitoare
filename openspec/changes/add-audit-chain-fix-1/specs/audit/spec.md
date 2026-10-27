# Spec Delta

## Purpose
Tamper-evident audit log: one hash chain per tenant.

## ADDED Requirements

### Requirement: verifyChain reports the first bad event — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 5.2: a head below the walked tip is reported as a hash failure instead of passing
- **WHEN** verifyChain walks an intact chain whose head row holds a seq at or above fromSeq but below the last walked seq
- **THEN** it returns ok true with checked equal to the number of walked events, and a head seq equal to the tip with a differ

#### Scenario: task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporti...
- **WHEN** verifyChain walks a stored event row for which chainHash or canonicalEvent throws
- **THEN** verifyChain resolves with ok false, checked equal to the numb

### Requirement: task 5.1 is ticked as already satisfied, but its text is not done — finding F-1abb4766
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 5.1 is ticked as already satisfied, but its text is not done
- **WHEN** verifyChain walks a stored event row for which chainHash or canonicalEvent throws
- **THEN** verifyChain resolves with ok false, checked equal to the number of rows verified before it, fir

### Requirement: task 5.2 is ticked as already satisfied, but its text is not done — finding F-2a235267
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 5.2 is ticked as already satisfied, but its text is not done
- **WHEN** verifyChain walks an intact chain whose head row holds a seq at or above fromSeq but below the last walked seq
- **THEN** it returns ok true with checked equal to the number of
