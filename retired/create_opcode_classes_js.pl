#!/usr/bin/perl
use warnings;
use strict;
use feature qw! :5.32 signatures !;
no warnings "experimental::signatures";

use Text::CSV qw!csv!;
use Data::Dumper qw!Dumper!;
$Data::Dumper::Terse = 1;
$Data::Dumper::Indent = 0;

# Instruction headers:
#   "Op","990 Section",9900,"9995 Section","99000 Section","990/12 Section",
#   "Function","Class","Data Type",
#   "Code","Binary","Format",
#   "9995 MID","99000 MID","Platform",
#   "Lg","Ag","Eq","C","Ov","Par","X","Pr","Mf","MM","OI","CS","IntMask",
#   "Importance","Note"
my $instruction_data = csv (in => '../data/990_instruction_set.csv', headers=> 'auto');

# Opcode formats headers:
#   "Sort","Instlen","Format",
#   0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
#   "Min Value","Max Value","Range","Bitmask",
#   "Overlaps1","Overlap","Instr. Mask","Overlaps2","Masklen",
#   "Source","Notes2","Name"
my $raw_format_data = csv (in => '../data/990_opcode_formats.csv', headers=> 'auto');

# This is lifted from create_format_files
my @formats = (0,);
foreach my $row (@$raw_format_data) {
    next unless $row->{'Format'} =~ m/^\d+$/;
    $formats[$row->{'Format'}] //= [0,];
    $formats[$row->{'Format'}]->[$row->{'Var'}] = {
        'name' =>  $row->{'Name'},
        'op_words' => $row->{'OpSize'},
        'ops' => [],
        'args' => [],
        'arg_start_bit' => $row->{'ArgStart'},
        'arg_mask' => hex $row->{'ArgMaxVal'}, # 1 for arg, 0 for opcode+left padding
        # These are per-variant
        'op_start_bit' => $row->{'StartAt'},
        'op_range_start' => hex $row->{'MinOp'},
        'op_range_end' => hex $row->{'MaxOp'},
        'minimum_value' => hex $row->{'MinOp'},
        'maximum_value' => hex $row->{'OpMax'},
        'mid' => $row->{'Mid?'},
    };
    my $last_arg = '';
    my $last_arg_counter = 0;
    foreach my $bit (0 .. 31) {
        next if $row->{"$bit"} =~ m/^0|1|x$/;
        last if $bit == 16 && $row->{"$bit"} eq '';
        $row->{"$bit"} =~ s/ /_/; # "s len" => "s_len"

        if ($row->{"$bit"} ne $last_arg) {
            if ($last_arg ne '') {
                push @{ $formats[$row->{'Format'}]->[$row->{'Var'}]->{'args'} }, $last_arg;
                push @{ $formats[$row->{'Format'}]->[$row->{'Var'}]->{'args'} }, $last_arg_counter;
            }
            $last_arg = $row->{"$bit"};
            $last_arg_counter = 0;
        }
        $last_arg_counter++;
    }
    if ($last_arg ne '') {
        push @{ $formats[$row->{'Format'}]->[$row->{'Var'}]->{'args'} }, $last_arg;
        push @{ $formats[$row->{'Format'}]->[$row->{'Var'}]->{'args'} }, $last_arg_counter;
    }
}

# This is also lifted from create_format_files
foreach my $fid (1 .. (scalar @formats) - 1) {
    foreach my $vid (1 .. (scalar @{ $formats[$fid] }) - 1) {
        my $format = $formats[$fid]->[$vid];
        foreach my $instruction (@$instruction_data) {
            next if ($instruction->{'Format'} != $fid);
            my $opcode = hex $instruction->{'Code'};
            my $starts_inside_range = ($opcode >= $format->{'op_range_start'}) && ($opcode <= $format->{'op_range_end'});

            if ($starts_inside_range) {
                $instruction->{'FormatVar'} = $vid;
                push @{ $formats[$fid]->[$vid]->{'ops'} }, $instruction->{'Op'};
            }
        }
    }
}

my %platform_groups = (
    'base' => 'Base instruction set, all platforms',
    'group A' => 'Memory mapping instructions, requires hardware.',
    'group B' => '990/12 features added to 9995 and later generations, including the 990/10A',
    'group C' => '990/12 features added to 99100 and later generations; 9995 MID',
    'group D' => '99110-exclusive features; 99100 MID',
    'group E' => '990/12-exclusive features; 9995 & 99100 MID',
    'group F32' => '990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID',
    'group F64' => '990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID',
);
# Platform order/sort notes:
#  - 990/10 came first
#  - 9900 and 990/4 came together
#  - 990/12 came after 990/4 but was TTL like 990/10
#  - 9995 launched some time afterward
#  - 99000 series launched before the next machines for our purposes
#  - 990/5 is a 99000-based 990/4... no explicit support but it should work like a 99100
#  - 990/10A is a 99000-based 990/10
# Possible values:
#  - 0: No support
#  - 1: Supported
#  - "MID": No native support but can be emulated by MID
my @platform_support_order = ('990/10','9900','990/4','990/12','9995','99000','99110A','990/10A');

my %docs = (
    'A' => '0943422-9701 990 Computer Reference Manual, Preliminary, Oct 1974.pdf',
    'B' => '0943441-9701 990 9900 Assembly Language Programmer\'s Guide, Oct 1978.pdf',
    'C' => '2250077-9701 990-12 Assembly Language Programmer\'s Guide, May 1979.pdf',
    'D' => '???????-???? TMS 9995 16-Bit Microcomputer Data Manual.pdf',
    'E' => 'ISBN 0911061010 Introduction to Assembly Language for the TI Home Computer, 1983.pdf',
    'F' => '2270509-9701 990 99000 Assembly Language Reference Manual, November 1982.pdf',
    'G' => '???????-???? TMS99105A and TMS99110A 16-Bit Microprocessors Preliminary Data Manual, Nov 1982.pdf',
    'H' => 'ISBN 0136228461 The 99000 Microprocessor - Architecture, Software, and Interface Techniques, 1984.pdf',
    'I' => '945250-9701 990 Computer Family Systems Handbook 3rd Edition, May 1976.pdf',
);
my @book_order = ('F', 'C', 'B', 'A', 'H', 'G', 'D', 'I');

my $template = q~
    static %s = new class extends Op {
        get op() {                          return "%s"; }
        get shortdesc() {                   return "%s"; }
        get opcode() {                      return %d; } // %s
        get opcode_legal_max() {            return %d; } // %04X
        get arg_start_bit() {               return %d; }
        get args() {                        return {%s}; }
        get platforms() {
            return { // Platform %s (%s)
%s
            };
        }
        get format() {                      return %d; }
        get format_var() {                  return %d; }
        get performs_privilege_check() {    return %s; }
        get touches_status_bits() {         return [%s]; }
    };
~;

my @status_fields = ("Lgt","Agt","Eq","Car","Ov","Par","XOP","Priv","Mf","MM","Oint","WCS","IntMask");
#
foreach my $op (@$instruction_data) {
    my $opcode_max = hex($op->{'Code'}) + oct('0b' . ('1' x (16 - $formats[$op->{'Format'}]->[$op->{'Var'}]->{'arg_start_bit'})));

    my @args_strings;
    my $args_format = q~'%s': %d~;
    my @args = @{ $formats[$op->{'Format'}]->[$op->{'Var'}]->{'args'} };
    while (scalar @args > 1) {
        my $arg = shift @args;
        my $bit_count = shift @args;
        push @args_strings, sprintf($args_format, $arg, $bit_count);
    }

    my @ps_strings;
    my $ps_format = q~                '%s'%s:  %s,%s~;
    foreach my $platform (@platform_support_order) {
        my $supported = $op->{$platform . '?'} ne 'no';
        $supported = 0 if $op->{$platform . '?'} =~ m/illegal/i;
        $supported = 0 if $op->{$platform . '?'} =~ m/99110A only/;
        $supported = 1 if $op->{$platform . '?'} =~ m/^yes /;
        my $is_mid = $op->{$platform . '?'} eq 'MID';
        my $supported_string = $supported ? 'true' : ($is_mid ? '"MID"' : 'false');
        my $comment = '';
        if ( !($op->{$platform . '?'} eq 'yes' || $op->{$platform . '?'} eq 'no' || $op->{$platform . '?'} eq 'MID') ) {
            $comment = ' // ' . $op->{$platform . '?'};
        }
        push @ps_strings, sprintf($ps_format, $platform, ' ' x (8 - length $platform), $supported_string, $comment);
    }

    my @docref_strings;
    my $docref_format = '#   Page %d of PDF "%s"';
    foreach my $book (@book_order) {
        my $key = $book . ' Page';
        next if $op->{$key} !~ m/\d/;
        push @docref_strings, sprintf($docref_format, $op->{$key}, $docs{$book});
        last if scalar @docref_strings >= 2;
    }

    no strict 'refs';
    printf(
        $template,
        $op->{'Op'},
        $op->{'Op'},
        $op->{'Function'},
        hex $op->{'Code'}, $op->{'Code'},
        $opcode_max, $opcode_max,
        $formats[$op->{'Format'}]->[$op->{'Var'}]->{'arg_start_bit'},
        join(', ', @args_strings),
        $op->{'Platform'}, $platform_groups{$op->{'Platform'}},
        join("\n", @ps_strings),
        $op->{'Format'},
        $op->{'Var'},
        $op->{'Priv?'} eq 'X' ? 'true' : 'false',
        join(', ', Dumper(grep { defined $op->{$_} && $op->{$_} eq 'X' } @status_fields)) # Yes, this works
    );

}

say join (', ', map { '"' . $_->{'Op'} . '"' } @$instruction_data);
