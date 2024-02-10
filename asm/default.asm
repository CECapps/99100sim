                DORG    0
start_pixel     EQU     R1
end_pixel       EQU     R2
color_increment EQU     R3
pixel_increment EQU     R4
initial_color   EQU     R5

foo             EQU     initial_color
bar             EQU     foo
baz             EQU     99

current_pixel   EQU     R8
current_color   EQU     R9

                AORG    0

                DATA    >80,>100,>80,>100,>80,>100,>80,>100 ; Interrupts 0 - 3
                DATA    >80,>100,>80,>100,>80,>100,>80,>100 ; Interrupts 4 - 7
                DATA    >80,>100,>80,>100,>80,>100,>80,>100 ; Interrupts 8 - 11
                DATA    >80,>100,>80,>100,>80,>100,>80,>100 ; Interrupts 12 - 15

                DATA    >80,>100,>80,>100,>80,>100,>80,>100  ; XOP 0 - 3
                DATA    >80,>100,>80,>100,>80,>100,>80,>100  ; XOP 4 - 7
                DATA    >80,>100,>80,>100,>80,>100,>80,>100  ; XOP 8 - 11
                DATA    >80,>100,>80,>100,>80,>100,>80,>100  ; XOP 12 - 15

                AORG    >0080

workspace       BSS     32
scratch         BSS     32

                AORG    >0100

setup:
    LI      start_pixel,>0200
    LI      end_pixel,>11FF
    LI      color_increment,1
    LI      pixel_increment,2
    LI      initial_color,0
init:
    MOV     start_pixel,current_pixel
    MOV     initial_color,current_color
    MOV     workspace,R6
    MOV     scratch,R7
loop:
    MOV     current_color,*current_pixel    ; Draw pixel
    A       pixel_increment,current_pixel   ; Bump next pixel
    JNO     ok1                             ; No overflow => continue
    MOV     start_pixel,current_pixel       ; Reset to min
ok1:
    C       current_pixel,end_pixel         ; Out of bounds?
    JLE     ok2                             ; No bounds => continue
    MOV     start_pixel,current_pixel       ; Reset to min
ok2:
    A       color_increment,current_color   ; Bump next color.
    JNO     loop                            ; No overflow => loop
    MOV     initial_color,current_color     ; Reset color

    JMP     loop                            ; => loop

    END     setup ; entry point

    AORG    >FFFC       ; reset vector
    DATA    >80,>100
