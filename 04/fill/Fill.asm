// Make Screen become black when any keyboard's button clicked!

//----------------------- Reading keyboard
@READ
0;JMP
(READ)
	@KBD
	D=M

	@WHITE
	D;JEQ

	@BLACK 
	D;JNE
//-----------------------  (16384 - 8191)


(WHITE)
	@16384
	D=A
	@addr
	M=D

	(LOOP1)
	@addr
	A=M
	M=0

	@addr
	M=M+1
	@8191
	D=A
	@addr
	D=D-M
	@LOOP1
	D;JNE

	@READ
	0;JMP




(BLACK)
	@16384
	D=A
	@addr
	M=D

	(LOOP2)
	@addr
	A=M
	M=-1

	@addr
	M=M+1
	@8191
	D=A
	@addr
	D=D-M
	@LOOP2
	D;JNE

	@READ
	0;JMP
