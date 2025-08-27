import math
from typing import Iterable, Iterator
from collections import deque

SPACING = 0.5
SUPPORT_RADIUS = 1.5 * SPACING
def _kernel(x):
    x = (x / SPACING) + 1.5
    if x <= 1:
        y = x * x / 2
    elif x <= 2:
        y = (2 - x) * (x - 1) + 0.5
    else:
        x = x - 3
        y = x * x / 2
    return y / SPACING

def get_seq(note_times: Iterable[float]) -> Iterator[float]:
    note_times = iter(note_times)
    queue = deque()
    # raises StopIteration if note_times is empty, which is desired
    first = next(note_times, None)
    if first is None:
        return
    sample_loc = math.ceil((first - SUPPORT_RADIUS) / SPACING) * SPACING
    queue.append(first)
    while queue:
        lbound = sample_loc - SUPPORT_RADIUS
        rbound = sample_loc + SUPPORT_RADIUS
        # add new notes, ensuring last note in queue is beyond the
        # window, if possible
        if queue[-1] < rbound:
            next_note = next(note_times, None)
            while next_note is not None and next_note < rbound:
                queue.append(next_note)
                next_note = next(note_times, None)
            if next_note is not None:
                queue.append(next_note)
        # clear old notes
        while queue and queue[0] < lbound:
            queue.popleft()

        accum = 0
        for time in queue:
            if time < rbound:
                accum += _kernel(sample_loc - time)
        yield accum
        sample_loc += SPACING

THRESHOLDS = [0, 0.2, 0.4, 0.6, 0.8]
BREAK_LENGTHS = [0, 1, 2, 4, 8, 16]
def extract_features(seq: list[float]):
    max_nps = max(seq)
    length = len(seq)
    cum_nps_per_bin = [0 for _ in THRESHOLDS]
    count_per_bin = [0 for _ in THRESHOLDS]
    # num of samples where NPS > the threshold (fraction of max NPS)
    threshold_counts = [0 for _ in THRESHOLDS]
    segs_per_thresh = [[] for _ in THRESHOLDS]
    for nps in seq:
        for thresh_i, thresh in enumerate(THRESHOLDS):
            segs = segs_per_thresh[thresh_i]
            if nps > thresh * max_nps:
                threshold_counts[thresh_i] += 1
                if not segs or segs[-1] < 0: # if prev was break, start a new seg
                    segs.append(0)
                segs[-1] += 1
            else:
                if not segs or segs[-1] > 0: # if prev was a block, start a new seg
                    segs.append(0)
                segs[-1] -= 1
        bin_i = -1
        for thresh in THRESHOLDS:
            if nps > thresh * max_nps:
                bin_i += 1
            else:
                break
        if bin_i > -1:
            cum_nps_per_bin[bin_i] += nps
            count_per_bin[bin_i] += 1
    
    default_avg_nps = [x * max_nps for x in (0.1, 0.3, 0.5, 0.7, 0.9)]
    avg_nps_per_bin = [
        (cum_nps / count if count > 0 else default)
        for cum_nps, count, default in zip(cum_nps_per_bin, count_per_bin, default_avg_nps)
    ]

    density_per_bin = []
    for segs, count in zip(segs_per_thresh, threshold_counts):
        total_len = length
        if segs:
            if segs[0] < 0:
                total_len += segs[0]
            if len(segs) > 1 and segs[-1] < 0:
                total_len += segs[-1]
            density_per_bin.append(count / total_len)
        else:
            density_per_bin.append(0)


    # longest continuous block of NPS >= threshold
    # allowing for different lengths of break
    longest_blocks = [[0 for _ in BREAK_LENGTHS] for _ in THRESHOLDS]
    for thresh_i, thresh in enumerate(THRESHOLDS):
        segs = segs_per_thresh[thresh_i]
        for break_i, break_len in enumerate(BREAK_LENGTHS):
            cur_block = 0
            longest_block = 0
            for seg in segs:
                assert seg != 0
                if seg > 0: # is block
                    cur_block += seg
                elif -seg > break_len: # is break
                    # end block
                    longest_block = max(longest_block, cur_block)
                    cur_block = 0
            longest_block = max(longest_block, cur_block)
            longest_blocks[thresh_i][break_i] = longest_block

    return [
        max_nps,
        math.log2(length+1),
        # avg_nps_per_bin,
        # threshold_counts,
        # density_per_bin
        # longest_blocks
        *avg_nps_per_bin,
        *(math.log2(x+1) for x in threshold_counts),
        *density_per_bin,
        *(math.log2(x+1) for row in longest_blocks for x in row)
    ]