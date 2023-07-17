document.addEventListener('DOMContentLoaded', function() {
    atualizarCarrinho();
  });
  
  
  const items = [
    {
      id: 0,
      nome: 'Camiseta Looney Toones',
      valor: 'R$29,99',
      tamanho: 'M',
      marca: 'Disney',
      condicao: 'Nova',
      img: '/img/produtos/camiseta.png',
      detalhes: 'Camiseta infantil com estampa divertida',
      quantidade: 0,
    },
    {
      id: 1,
      nome: 'Short Jeans',
      valor: 'R$29,99',
      tamanho: '40/M',
      marca: 'Youcom',
      condicao: 'Nova',
      img: '/img/produtos/short.png',
      detalhes: 'Short jeans feminino com cintura alta',
      quantidade: 0,
    },
    {
      id: 2,
      nome: 'Sapato Amarelo',
      valor: 'R$49,99',
      tamanho: '38',
      marca: 'Lolla',
      condicao: 'Nova',
      img: '/img/produtos/sapato.png',
      detalhes: 'Sapato amarelo de salto alto',
      quantidade: 0,
    },
  ];
  
  let filteredItems = [];
  
  inicializarCarrinho = () => {
    filteredItems = items.filter(item => item.quantidade > 0);
    renderCarrinho();
  };
  
  renderCarrinho = () => {
    const containerCarrinho = document.getElementById('carrinho');
    containerCarrinho.innerHTML = '<h2>Carrinho:</h2>';
  
    let totalGeral = 0;
    let somaProdutos = 0;
  
    filteredItems.forEach((item) => {
      const total = parseFloat(item.valor.replace('R$', '')) * item.quantidade;
      totalGeral += total;
      somaProdutos += item.quantidade;
  
      containerCarrinho.innerHTML += `
        <p>${item.nome} | Quantidade: ${item.quantidade} | Total: R$${total.toFixed(2)}</p>
        <hr>
      `;
    });
  
    if (somaProdutos === 1) {
      containerCarrinho.innerHTML += `<p>Total (${somaProdutos} item): R$${totalGeral.toFixed(2)}</p>`;
    } else {
      containerCarrinho.innerHTML += `<p>Total (${somaProdutos} itens): R$${totalGeral.toFixed(2)}</p>`;
    }
  };
  
  function searchFunction() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    filteredItems = items.filter(item => {
      const itemInfo = [
        item.nome,
        item.detalhes,
        item.tamanho,
        item.marca,
        item.condicao,
      ].map(info => info.toLowerCase());
      return itemInfo.some(info => info.includes(searchTerm));
    });
  
    renderCarrinho();
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      searchFunction();
    }
  }
  
  inicializarCarrinho();
  