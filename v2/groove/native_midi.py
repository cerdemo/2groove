"""RtMidi's C++ input queue avoids Python callbacks during CoreMIDI disposal.

Mido's input adapter installs a Python callback even in polling mode. Here the
native callback writes to RtMidi's queue; only our scheduler thread enters Python.
This avoids the callback/GIL disposal hang reproduced by the native loopback test.
"""
import mido
import rtmidi


class Input:
    def __init__(self,name,virtual=False,roles=()):
        self.name=name;self.roles=roles;self.last_stamp=None;self.rt=rtmidi.MidiIn(queue_size_limit=4096)
        self.rt.ignore_types(sysex=True,timing=False,active_sense=True)
        try:
            if virtual:self.rt.open_virtual_port(name)
            else:
                names=self.rt.get_ports()
                if name not in names:raise ValueError(f'Unknown MIDI input: {name}')
                self.rt.open_port(names.index(name))
        except Exception:
            self.close();raise

    def drain(self,now):
        messages=[]
        for _ in range(4096):
            item=self.rt.get_message()
            if item is None:break
            data,delta=item
            try:msg=mido.Message.from_bytes(data)
            except ValueError:continue
            messages.append((msg,delta))
        if not messages:return []
        # RtMidi deltas come from native arrival times. Preserve them across polls,
        # so Python polling jitter does not become MIDI clock tempo jitter. Only the
        # initial anchor has poll latency; re-anchor after a large discontinuity.
        duration=sum(max(0,delta) for _,delta in messages)
        predicted=None if self.last_stamp is None else self.last_stamp+duration
        if predicted is None or abs(predicted-now)>.25:
            stamp=now-duration
        else:stamp=self.last_stamp
        result=[]
        for msg,delta in messages:
            stamp+=max(0,delta);result.append((msg,stamp))
        self.last_stamp=stamp
        return result

    def close(self):
        if self.rt is not None:
            self.rt.close_port();self.rt.delete();self.rt=None
