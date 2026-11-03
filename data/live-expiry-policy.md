# Live event visibility

The live map, results and venue programmes hide expired occurrences; catalogues, source registries, saved records and historical IDs are retained. `onDate` remains a calendar-membership query; `availableOnDate` adds the live cutoff. Each of the six cities sets an IANA timezone. Browser/device timezone is never used for event deadlines.

Priority:
1. A dated visitSchedule or dailySchedule, or recurring visitingHours, supplies the selected visit's closing time, even if an exhibition also has a much later final endAt.
2. A single session's published endAt/endDateTime, or local end/endTime with its date, supplies its end. A local end before the start rolls to the next day. Equal clocks do not imply a 24-hour event.
3. A published duration can supply a display cutoff when no end is known.
4. A single session with a start but no usable duration/end gets a two-hour display grace from its start. This is a visibility policy, not a claim about duration or admission.
5. Explicit multi-day ranges without known daily hours retain their final date. Unknown starts are retained until that occurrence's local date ends. No start/end fact is fabricated.

The 12 Palo Alto UNAFF sessions already say their computed end excludes later discussions. Their original times remain unchanged; `endTimeEstimated` marks those existing estimates, and the display cutoff allows at most 60 additional minutes after the known final-film end. This grace is not a confirmed discussion end.

The four Tbilisi gallery `visitingHours` fields copy existing source-checked hours and retain the original text, evidence links and checked timestamps. National Gallery closure dates and weekdays still apply. LC Queisser's Sunday-by-appointment note is preserved; no unsourced Sunday hours are inferred.

Future selected days keep their forthcoming occurrences. Genuine overnight non-cinema sessions may continue into the next calendar day until their end; cinema sessions remain assigned only to their advertised start date. DST folds choose the later end when only an ambiguous local clock is available; explicit offsets always take precedence.

Visible pages repaint every 60 seconds and immediately on tab resume, back/forward-cache restore or reconnect. Repainting does not wait for a catalogue network request and still works offline or while a request is pending. Open result/group/venue programme lists refresh too. Unchanged APK files retain their bundled UI until a later app release; this change is published to the website's RU/EN routes.
