"""
Yeah this is my own code I copied from itgdb, so I guess I'll put
the MIT license here:

MIT License

Copyright © 2024 som1sezhi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

import hashlib
import re
from simfile.types import Chart, Simfile


def _normalize_decimal(decimal):
    rounded = round(float(decimal), 3)
    return '%.3f' % (rounded,)


def _normalize_float_digits(param):
    param_parts = []
    for beat_bpm in re.findall('[^,]+', param):
        m = re.search('(.+)=(.+)', beat_bpm)
        normd = _normalize_decimal(m[1]) + '=' + _normalize_decimal(m[2])
        param_parts.append(normd)
    return ','.join(param_parts)


def _minimize_measure(measure):
    if not measure:
        # if the measure is empty, it will cause an infinite loop in
        # the while loop after this, so we have to catch it now
        # TODO: figure out a more proper way of dealing with empty measures
        raise RuntimeError('chart contains an empty measure')
    minimal = False
    while not minimal and len(measure) % 2 == 0:
        all_zeroes = True
        for row in measure[1::2]:
            if row != '0' * len(row):
                all_zeroes = False
                break
        if all_zeroes:
            measure = measure[::2]
        else:
            minimal = True
    return measure


def _minimize_chart(chart_str):
    final_data = []
    cur_measure = []
    for line in chart_str.split('\n'):
        if line == ',':
            cur_measure = _minimize_measure(cur_measure)
            final_data.extend(cur_measure)
            final_data.append(',')
            cur_measure.clear()
        else:
            cur_measure.append(line)
    if cur_measure:
        cur_measure = _minimize_measure(cur_measure)
        final_data.extend(cur_measure)
    return '\n'.join(final_data)


def get_hash(sim: Simfile, chart: Chart) -> str:
    """Get the Groovestats hash of a chart."""
    # TODO: is all this necessary?
    notedata = chart.notes
    notedata = re.sub(r'\r\n?', r'\n', notedata)
    notedata = notedata.strip()
    notedata = re.sub(r'//[^\n]*', '', notedata)
    notedata = re.sub(r'[\r\t\f\v ]+', '', notedata)
    notedata = _minimize_chart(notedata)
    # use .get() to handle SMChart gracefully
    bpms = _normalize_float_digits(chart.get('BPMS') or sim.bpms)
    return hashlib.sha1((notedata + bpms).encode()).hexdigest()
